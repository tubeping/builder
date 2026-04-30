/**
 * 통계 집계 API — 크리에이터 본인의 데이터를 집계해 반환.
 *
 * 자동 수집:
 *   - 유입/클릭: pick_clicks (튜핑 자체)
 *   - 매출/영업이익: 향후 카페24/쿠팡 Report API 연동 시 자동 채워짐
 *   - 시청자 반응: 향후 YouTube/Instagram API 연동 시 자동 채워짐
 *
 * 데이터 소스 라벨(`data_sources`)을 응답에 포함해 UI에서 "자동 수집 vs 외부 연동 대기" 구분.
 *
 * 기간: ?days=7 | 30 | 90 (기본 30)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

// 마진 계산 (PG 3% + 세금 10% 차감 후 인플 60%)
const PG_FEE_RATE = 0.03;
const TAX_RATE = 0.10;
const INFLUENCER_RATIO = 0.6;

function calcTakeHome(gmv: number, supplyCost: number): number {
  if (gmv <= 0) return 0;
  const pgFee = gmv * PG_FEE_RATE;
  const tax = (gmv - supplyCost) * TAX_RATE;
  const netMargin = gmv - supplyCost - pgFee - tax;
  return Math.max(0, netMargin * INFLUENCER_RATIO);
}

export async function GET(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("days") || "30") || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const sincePrev = new Date(Date.now() - 2 * days * 86400000).toISOString();

  // creator 조회
  const { data: creator } = await supabase
    .from("creators")
    .select("id, shop_slug, channel_url")
    .eq("email", user.email)
    .single();

  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  // ── 1. 클릭 (pick_clicks) ──
  const { data: clicks } = await supabase
    .from("pick_clicks")
    .select("id, pick_id, source_type, utm_source, utm_medium, utm_campaign, device, ip_hash, clicked_at")
    .eq("shop_slug", creator.shop_slug)
    .gte("clicked_at", since)
    .order("clicked_at", { ascending: false })
    .limit(10000);

  const rows = clicks || [];

  // 전기 비교용
  const { data: prevClicks } = await supabase
    .from("pick_clicks")
    .select("id, ip_hash")
    .eq("shop_slug", creator.shop_slug)
    .gte("clicked_at", sincePrev)
    .lt("clicked_at", since)
    .limit(10000);
  const prevRows = prevClicks || [];

  // ── 집계: 유입·클릭 ──
  const totalClicks = rows.length;
  const uniqueVisitors = new Set(rows.map(r => r.ip_hash).filter(Boolean)).size;
  const uniquePicks = new Set(rows.map(r => r.pick_id).filter(Boolean)).size;

  const prevClicksTotal = prevRows.length;
  const prevVisitors = new Set(prevRows.map(r => r.ip_hash).filter(Boolean)).size;

  const pctChange = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

  // ── 일별 ──
  const dailyMap = new Map<string, { clicks: number; visitors: Set<string>; gmv: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { clicks: 0, visitors: new Set(), gmv: 0, orders: 0 });
  }
  for (const r of rows) {
    const key = (r.clicked_at as string).slice(0, 10);
    const slot = dailyMap.get(key);
    if (slot) { slot.clicks++; if (r.ip_hash) slot.visitors.add(r.ip_hash as string); }
  }
  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date, clicks: v.clicks, visitors: v.visitors.size, gmv: v.gmv, orders: v.orders,
  }));

  // ── 소스별 ──
  const sourceMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.utm_source || r.source_type || "direct";
    sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
  }
  const by_source = Array.from(sourceMap.entries())
    .map(([source, c]) => ({
      source, clicks: c,
      pct: totalClicks > 0 ? Math.round((c / totalClicks) * 100) : 0,
      gmv: 0,  // 외부 연동 시 채워짐
    }))
    .sort((a, b) => b.clicks - a.clicks);

  // ── 디바이스별 ──
  const deviceMap = new Map<string, number>();
  for (const r of rows) {
    deviceMap.set((r.device as string) || "unknown", (deviceMap.get((r.device as string) || "unknown") || 0) + 1);
  }
  const by_device = Array.from(deviceMap.entries())
    .map(([device, c]) => ({ device, clicks: c }))
    .sort((a, b) => b.clicks - a.clicks);

  // ── TOP PICK ──
  const pickMap = new Map<string, number>();
  for (const r of rows) {
    if (r.pick_id) pickMap.set(r.pick_id as string, (pickMap.get(r.pick_id as string) || 0) + 1);
  }
  const topIds = Array.from(pickMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  let top_picks: { pick_id: string; name: string; image: string | null; clicks: number; revenue: number }[] = [];
  if (topIds.length > 0) {
    const { data: pickRows } = await supabase
      .from("creator_picks")
      .select("id, product_name, image, source_meta")
      .in("id", topIds.map(([id]) => id));
    const info = new Map<string, { name: string; image: string | null }>();
    for (const p of pickRows || []) {
      const m = p.source_meta as { name?: string; image?: string } | null;
      info.set(p.id, {
        name: (m?.name as string) || (p.product_name as string) || "상품",
        image: (m?.image as string) || (p.image as string) || null,
      });
    }
    top_picks = topIds.map(([pick_id, c]) => ({
      pick_id,
      name: info.get(pick_id)?.name || "삭제된 상품",
      image: info.get(pick_id)?.image || null,
      clicks: c,
      revenue: 0,  // 매출 연동 시 채워짐
    }));
  }

  // ── 캠페인별 ──
  const campaignMap = new Map<string, number>();
  for (const r of rows) {
    if (r.utm_campaign) campaignMap.set(r.utm_campaign as string, (campaignMap.get(r.utm_campaign as string) || 0) + 1);
  }
  const by_campaign = Array.from(campaignMap.entries())
    .map(([campaign, c]) => ({ campaign, clicks: c, gmv: 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // ── 진행 공구 ──
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, status, target_gmv, actual_gmv, started_at, settled_at, products(product_name, image_url)")
    .eq("creator_id", creator.id)
    .order("started_at", { ascending: false })
    .limit(10);

  const now = Date.now();
  const active_campaigns = (campaigns || [])
    .filter((c) => {
      if (!c.started_at) return false;
      const start = new Date(c.started_at).getTime();
      const end = c.settled_at ? new Date(c.settled_at).getTime() : start + 7 * 86400000;
      return c.status === "running" || c.status === "approved";
    })
    .slice(0, 5)
    .map((c) => {
      const start = new Date(c.started_at!).getTime();
      const end = c.settled_at ? new Date(c.settled_at).getTime() : start + 7 * 86400000;
      const dDay = Math.ceil((end - now) / 86400000);
      const products = c.products as unknown as { product_name?: string; image_url?: string } | null;
      return {
        id: c.id,
        product_name: products?.product_name || "공구",
        image: products?.image_url || null,
        target_gmv: Number(c.target_gmv) || 0,
        actual_gmv: Number(c.actual_gmv) || 0,
        achievement_rate: c.target_gmv ? Math.round((Number(c.actual_gmv) / Number(c.target_gmv)) * 100) : 0,
        d_day: dDay,
      };
    });

  // ── GMV/영업이익 (현재는 0, 향후 카페24/쿠팡 Report 연동) ──
  // 향후: campaigns의 actual_gmv 합산 + Report API 데이터
  const totalGmvCampaigns = (campaigns || [])
    .filter((c) => {
      if (!c.started_at) return false;
      return new Date(c.started_at).getTime() >= new Date(since).getTime();
    })
    .reduce((s, c) => s + (Number(c.actual_gmv) || 0), 0);

  // 영업이익 추정: GMV의 7~10% (튜핑 공구 평균 마진 가정 — 추후 정확한 supply_price 사용)
  const totalGmv = totalGmvCampaigns;
  const estimatedTakeHome = totalGmv > 0 ? calcTakeHome(totalGmv, totalGmv * 0.6) : 0;

  const totalOrders = 0;  // 카페24 admin orders 연동 시 채워짐
  const cvr = uniqueVisitors > 0 && totalOrders > 0
    ? Math.round((totalOrders / uniqueVisitors) * 1000) / 10
    : null;

  // ── 퍼널 ──
  const funnel = {
    reach: uniqueVisitors,        // 방문자
    clicks: totalClicks,          // 클릭
    orders: totalOrders,          // 주문 (외부 연동)
    completed: 0,                 // 구매확정 (외부 연동)
    rates: {
      visit_to_click: uniqueVisitors > 0 ? Math.round((totalClicks / uniqueVisitors) * 1000) / 10 : 0,
      click_to_order: totalClicks > 0 && totalOrders > 0 ? Math.round((totalOrders / totalClicks) * 1000) / 10 : null,
    },
  };

  // ── 시청자 반응 (외부 연동 대기) ──
  // YouTube/Instagram OAuth 연동 후 youtube_accounts/instagram_accounts 테이블에서 읽어옴.
  // 현재는 데이터 없음 표시.
  const content = {
    available: false,
    sources: [] as string[],   // 연동된 소스 ("youtube", "instagram")
    totals: {
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
    },
    daily: [] as { date: string; views: number; likes: number; comments: number }[],
    top_content: [] as { id: string; title: string; thumbnail: string | null; platform: string; views: number; likes: number; comments: number; revenue: number }[],
    message: "YouTube·Instagram 채널을 연동하면 영상별 조회수·좋아요·댓글이 자동 수집되고, 매출과 연결된 콘텐츠 성과를 볼 수 있어요.",
  };

  // ── 자동 인사이트 (rule-based) ──
  const insights: { type: "positive" | "warning" | "info"; title: string; detail: string }[] = [];

  if (totalClicks > 0) {
    if (prevClicksTotal > 0) {
      const change = pctChange(totalClicks, prevClicksTotal);
      if (change !== null) {
        insights.push({
          type: change >= 0 ? "positive" : "warning",
          title: `${days}일 클릭 ${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%`,
          detail: `이전 ${days}일 대비 ${change >= 0 ? "증가" : "감소"} (${prevClicksTotal} → ${totalClicks})`,
        });
      }
    }
    if (by_source.length > 0) {
      const top = by_source[0];
      insights.push({
        type: "info",
        title: `최대 유입: ${top.source}`,
        detail: `전체 클릭의 ${top.pct}%가 ${top.source}에서 발생 (${top.clicks}건)`,
      });
    }
    if (top_picks.length > 0) {
      insights.push({
        type: "info",
        title: `TOP PICK: ${top_picks[0].name}`,
        detail: `${top_picks[0].clicks}회 클릭 — 인기 상품을 영상·릴스에서 더 자주 노출해보세요`,
      });
    }
  } else {
    insights.push({
      type: "info",
      title: "아직 유입 데이터가 없어요",
      detail: "공유 링크 생성기에서 만든 UTM 링크를 인스타·유튜브에 걸어두시면 다음 통계부터 채워집니다",
    });
  }

  if (active_campaigns.length > 0) {
    const c = active_campaigns[0];
    if (c.d_day >= 0 && c.achievement_rate > 0) {
      insights.push({
        type: c.achievement_rate >= 80 ? "positive" : "warning",
        title: `${c.product_name} 공구 D-${c.d_day}`,
        detail: `목표 달성률 ${c.achievement_rate}% (${c.actual_gmv.toLocaleString()}원 / 목표 ${c.target_gmv.toLocaleString()}원)`,
      });
    }
  }

  if (!content.available) {
    insights.push({
      type: "info",
      title: "콘텐츠 → 매출 연결 잠금",
      detail: "YouTube·Instagram 연동 시 어떤 영상이 매출로 이어졌는지 보입니다",
    });
  }

  return NextResponse.json({
    totals: {
      clicks: totalClicks,
      unique_visitors: uniqueVisitors,
      unique_picks: uniquePicks,
      days,
      gmv: totalGmv,
      take_home: estimatedTakeHome,
      orders: totalOrders,
      avg_order: totalOrders > 0 ? Math.round(totalGmv / totalOrders) : 0,
      conversion_rate: cvr,
      // 전기 대비 변화율
      delta: {
        clicks: pctChange(totalClicks, prevClicksTotal),
        visitors: pctChange(uniqueVisitors, prevVisitors),
      },
    },
    funnel,
    daily,
    by_source,
    by_device,
    top_picks,
    by_campaign,
    active_campaigns,
    content,
    insights,
    data_sources: {
      clicks_visitors: { status: "live", label: "튜핑 자체 추적" },
      gmv: { status: totalGmv > 0 ? "live" : "partial", label: totalGmv > 0 ? "공구 캠페인" : "외부 연동 대기 (카페24·쿠팡)" },
      take_home: { status: estimatedTakeHome > 0 ? "estimated" : "partial", label: "추정값 — 정확한 마진은 정산 시" },
      content: { status: "pending", label: "외부 연동 대기 (YouTube·Instagram)" },
    },
  });
}
