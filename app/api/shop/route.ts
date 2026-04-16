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

  // 활성 캠페인 조회
  const { data: campaigns } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("creator_id", creator.id)
    .in("status", ["approved", "running"])
    .limit(1);

  return NextResponse.json({
    creator,
    shop: shop || null,
    picks: picks || [],
    reviews: reviews || [],
    activeCampaign: campaigns?.[0] || null,
  });
}
