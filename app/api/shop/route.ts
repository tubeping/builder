import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug 필요" }, { status: 400 });
  }

  // 크리에이터 조회
  const { data: creator, error: creatorErr } = await supabaseAdmin
    .from("creators")
    .select("*")
    .eq("shop_slug", slug)
    .single();

  if (creatorErr || !creator) {
    return NextResponse.json({ error: "존재하지 않는 쇼핑몰" }, { status: 404 });
  }

  // 쇼핑몰 설정 조회
  const { data: shop } = await supabaseAdmin
    .from("creator_shops")
    .select("*")
    .eq("creator_id", creator.id)
    .single();

  // PICK 조회
  const { data: picks } = await supabaseAdmin
    .from("creator_picks")
    .select("*")
    .eq("creator_id", creator.id)
    .eq("visible", true)
    .order("display_order", { ascending: true });

  // 리뷰 조회
  const { data: reviews } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // 캠페인 전체 조회 (공구 캘린더용 — 진행 중 + 예정 + 최근 종료)
  const { data: campaigns } = await supabaseAdmin
    .from("campaigns")
    .select(`
      id, status, type, target_gmv, actual_gmv, commission_rate,
      proposed_at, approved_at, started_at, settled_at,
      products ( id, product_name, image_url, price )
    `)
    .eq("creator_id", creator.id)
    .in("status", ["proposed", "approved", "running", "completed"])
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(50);

  // 기존 호환: activeCampaign은 첫 번째 running/approved
  const activeCampaign = campaigns?.find((c) =>
    c.status === "approved" || c.status === "running"
  ) || null;

  return NextResponse.json({
    creator,
    shop: shop || null,
    picks: picks || [],
    reviews: reviews || [],
    campaigns: campaigns || [],
    activeCampaign,
  });
}
