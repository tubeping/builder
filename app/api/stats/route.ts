/**
 * 통계 집계 API — 크리에이터 본인의 pick_clicks 데이터를 집계해 반환.
 *
 * 기간 파라미터: ?days=7 | 30 | 90 (기본 30)
 *
 * 응답:
 *   totals: { clicks, unique_visitors, unique_picks, days }
 *   daily: [{ date, clicks, visitors }]
 *   by_source: [{ source, clicks, pct }]
 *   by_device: [{ device, clicks }]
 *   top_picks: [{ pick_id, name, image, clicks }]
 *   by_campaign: [{ campaign, clicks }]
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

export async function GET(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("days") || "30") || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // creator 조회
  const { data: creator } = await supabase
    .from("creators")
    .select("id, shop_slug")
    .eq("email", user.email)
    .single();

  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  // pick_clicks 전체 로우 (RLS로 본인 것만)
  const { data: clicks, error } = await supabase
    .from("pick_clicks")
    .select("id, pick_id, source_type, utm_source, utm_medium, utm_campaign, device, ip_hash, clicked_at")
    .eq("shop_slug", creator.shop_slug)
    .gte("clicked_at", since)
    .order("clicked_at", { ascending: false })
    .limit(10000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = clicks || [];

  // ── 집계 ──
  const totalClicks = rows.length;
  const uniqueVisitors = new Set(rows.map(r => r.ip_hash).filter(Boolean)).size;
  const uniquePicks = new Set(rows.map(r => r.pick_id).filter(Boolean)).size;

  // 일별
  const dailyMap = new Map<string, { clicks: number; visitors: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { clicks: 0, visitors: new Set() });
  }
  for (const r of rows) {
    const key = (r.clicked_at as string).slice(0, 10);
    const slot = dailyMap.get(key);
    if (slot) {
      slot.clicks++;
      if (r.ip_hash) slot.visitors.add(r.ip_hash);
    }
  }
  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date, clicks: v.clicks, visitors: v.visitors.size,
  }));

  // 소스별 (utm_source 우선, 없으면 source_type, 둘 다 없으면 direct)
  const sourceMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.utm_source || r.source_type || "direct";
    sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
  }
  const by_source = Array.from(sourceMap.entries())
    .map(([source, clicks]) => ({ source, clicks, pct: totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0 }))
    .sort((a, b) => b.clicks - a.clicks);

  // 디바이스
  const deviceMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.device || "unknown";
    deviceMap.set(key, (deviceMap.get(key) || 0) + 1);
  }
  const by_device = Array.from(deviceMap.entries())
    .map(([device, clicks]) => ({ device, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  // TOP PICK (pick_id 카운트 → creator_picks 조인)
  const pickMap = new Map<string, number>();
  for (const r of rows) {
    if (r.pick_id) pickMap.set(r.pick_id as string, (pickMap.get(r.pick_id as string) || 0) + 1);
  }
  const topPickIds = Array.from(pickMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let top_picks: { pick_id: string; name: string; image: string | null; clicks: number }[] = [];
  if (topPickIds.length > 0) {
    const { data: pickRows } = await supabase
      .from("creator_picks")
      .select("id, product_name, image, source_meta")
      .in("id", topPickIds.map(([id]) => id));
    const pickInfo = new Map<string, { name: string; image: string | null }>();
    for (const p of pickRows || []) {
      const m = p.source_meta as { name?: string; image?: string } | null;
      pickInfo.set(p.id, {
        name: (m?.name as string) || (p.product_name as string) || "상품",
        image: (m?.image as string) || (p.image as string) || null,
      });
    }
    top_picks = topPickIds.map(([pick_id, clicks]) => ({
      pick_id,
      name: pickInfo.get(pick_id)?.name || "삭제된 상품",
      image: pickInfo.get(pick_id)?.image || null,
      clicks,
    }));
  }

  // 캠페인(utm_campaign) 단위 TOP
  const campaignMap = new Map<string, number>();
  for (const r of rows) {
    if (r.utm_campaign) campaignMap.set(r.utm_campaign as string, (campaignMap.get(r.utm_campaign as string) || 0) + 1);
  }
  const by_campaign = Array.from(campaignMap.entries())
    .map(([campaign, clicks]) => ({ campaign, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return NextResponse.json({
    totals: {
      clicks: totalClicks,
      unique_visitors: uniqueVisitors,
      unique_picks: uniquePicks,
      days,
    },
    daily,
    by_source,
    by_device,
    top_picks,
    by_campaign,
  });
}
