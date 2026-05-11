/**
 * PICK 카드별 미니 통계 — 모든 PICK을 한 번에 batch 집계.
 *
 * 응답: { [pick_id]: { clicks_30d, visitors_30d, ctr, top_source, top_source_pct, last_clicked_at } }
 *
 * 페르소나 니즈: "어떤 경로로 어떻게 들어와서 판매가 됐는지" 한 눈에.
 * MyPicks 우측 sticky 패널의 각 카드 하단에 표시.
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

interface PickStat {
  clicks: number;
  visitors: number;
  ctr: number;
  top_source: string | null;
  top_source_pct: number;
  last_clicked_at: string | null;
  by_source: { source: string; clicks: number }[];
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

  // 모든 PICK 한 번에 가져옴
  const { data: picks } = await supabase
    .from("creator_picks")
    .select("id")
    .eq("creator_id", creator.id);

  if (!picks || picks.length === 0) {
    return NextResponse.json({ stats: {}, days });
  }

  // pick_clicks를 한 번에 fetch (모든 PICK 대상)
  const { data: clicks } = await supabase
    .from("pick_clicks")
    .select("pick_id, source_type, utm_source, ip_hash, clicked_at")
    .eq("shop_slug", creator.shop_slug)
    .gte("clicked_at", since)
    .limit(50000);

  const rows = clicks || [];

  // 집계: pick_id별
  const byPick = new Map<string, {
    clicks: number;
    visitors: Set<string>;
    sources: Map<string, number>;
    last: string | null;
  }>();

  for (const p of picks) {
    byPick.set(p.id, { clicks: 0, visitors: new Set(), sources: new Map(), last: null });
  }

  for (const r of rows) {
    if (!r.pick_id) continue;
    const slot = byPick.get(r.pick_id as string);
    if (!slot) continue;
    slot.clicks++;
    if (r.ip_hash) slot.visitors.add(r.ip_hash as string);
    const src = (r.utm_source as string) || (r.source_type as string) || "direct";
    slot.sources.set(src, (slot.sources.get(src) || 0) + 1);
    if (!slot.last || (r.clicked_at as string) > slot.last) slot.last = r.clicked_at as string;
  }

  // 응답 변환
  const stats: Record<string, PickStat> = {};
  for (const [pickId, v] of byPick.entries()) {
    const sortedSources = Array.from(v.sources.entries())
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks);
    const topSource = sortedSources[0];
    stats[pickId] = {
      clicks: v.clicks,
      visitors: v.visitors.size,
      ctr: v.visitors.size > 0 ? Math.round((v.clicks / v.visitors.size) * 100) : 0,
      top_source: topSource?.source || null,
      top_source_pct: topSource && v.clicks > 0 ? Math.round((topSource.clicks / v.clicks) * 100) : 0,
      last_clicked_at: v.last,
      by_source: sortedSources.slice(0, 3),
    };
  }

  return NextResponse.json({ stats, days });
}
