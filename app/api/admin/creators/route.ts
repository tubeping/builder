/**
 * Admin 전용 — 모든 크리에이터 목록 + 통계 미리보기.
 *
 * 권한: admin / super_admin만
 * 응답: { creators: [...], totalCount }
 *
 * 각 크리에이터의 미리보기 통계:
 *   - 최근 30일 클릭 수, 방문자 수
 *   - PICK 수, 진행 중 공구 수
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminRole } from "@/lib/auth-roles";

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

  // 본인 role 확인
  const { data: me } = await supabase
    .from("creators")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();

  if (!isAdminRole(me?.role)) {
    return NextResponse.json({ error: "Forbidden — admin 권한 필요" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";

  // 모든 크리에이터
  let query = supabase
    .from("creators")
    .select("id, email, name, shop_slug, channel_url, platform, category, role, subscriber_count, created_at")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,shop_slug.ilike.%${search}%`);
  }

  const { data: creators, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 통계 미리보기 — 한 번에 batch
  const slugs = (creators || []).map((c) => c.shop_slug).filter(Boolean) as string[];
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: clicks } = await supabase
    .from("pick_clicks")
    .select("shop_slug, ip_hash")
    .in("shop_slug", slugs)
    .gte("clicked_at", since)
    .limit(50000);

  const clickStats = new Map<string, { clicks: number; visitors: Set<string> }>();
  for (const c of clicks || []) {
    const slot = clickStats.get(c.shop_slug as string) || { clicks: 0, visitors: new Set() };
    slot.clicks++;
    if (c.ip_hash) slot.visitors.add(c.ip_hash as string);
    clickStats.set(c.shop_slug as string, slot);
  }

  // PICK 수
  const { data: pickRows } = await supabase
    .from("creator_picks")
    .select("creator_id, visible");
  const pickCount = new Map<string, { total: number; visible: number }>();
  for (const p of pickRows || []) {
    const cur = pickCount.get(p.creator_id as string) || { total: 0, visible: 0 };
    cur.total++;
    if (p.visible) cur.visible++;
    pickCount.set(p.creator_id as string, cur);
  }

  // 진행 중 공구 수
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("creator_id, status, started_at, settled_at");
  const campaignCount = new Map<string, number>();
  const now = Date.now();
  for (const c of campaigns || []) {
    if (!c.started_at) continue;
    const start = new Date(c.started_at).getTime();
    const end = c.settled_at ? new Date(c.settled_at).getTime() : start + 7 * 86400000;
    if ((c.status === "running" || c.status === "approved") && now >= start && now <= end) {
      campaignCount.set(c.creator_id as string, (campaignCount.get(c.creator_id as string) || 0) + 1);
    }
  }

  const enriched = (creators || []).map((c) => {
    const cs = clickStats.get(c.shop_slug || "") || { clicks: 0, visitors: new Set() };
    const pc = pickCount.get(c.id) || { total: 0, visible: 0 };
    return {
      ...c,
      stats: {
        clicks_30d: cs.clicks,
        visitors_30d: cs.visitors.size,
        pick_total: pc.total,
        pick_visible: pc.visible,
        active_campaigns: campaignCount.get(c.id) || 0,
      },
    };
  });

  return NextResponse.json({
    creators: enriched,
    totalCount: enriched.length,
  });
}
