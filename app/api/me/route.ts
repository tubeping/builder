import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

// GET: 내 크리에이터 프로필 + 쇼핑몰 설정
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("*, creator_shops(*)")
    .eq("email", user.email)
    .single();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...creator,
    auth_email: user.email,
    auth_id: user.id,
  });
}

// PATCH: 프로필 수정
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // creators 테이블 업데이트 가능 필드
  const creatorFields = ["name", "phone", "platform", "channel_url", "subscriber_count", "category", "persona", "shop_slug"];
  const creatorUpdates: Record<string, unknown> = {};
  for (const key of creatorFields) {
    if (key in body) creatorUpdates[key] = body[key];
  }

  // shop_slug 검증
  if ("shop_slug" in creatorUpdates) {
    const slug = String(creatorUpdates.shop_slug).toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(slug)) {
      return NextResponse.json({ error: "slug 형식 오류 (영문 소문자·숫자·하이픈·언더스코어 3~30자)" }, { status: 400 });
    }
    const RESERVED = ["admin", "api", "auth", "dashboard", "login", "signup", "shop", "settings", "onboarding", "tubeping", "www", "mail", "support"];
    if (RESERVED.includes(slug)) {
      return NextResponse.json({ error: "예약어 — 다른 슬러그를 선택해주세요" }, { status: 400 });
    }
    // 본인 외 다른 사용자가 쓰는지 확인
    const { data: existing } = await supabase
      .from("creators")
      .select("email")
      .eq("shop_slug", slug)
      .neq("email", user.email!)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 슬러그입니다" }, { status: 409 });
    }
    creatorUpdates.shop_slug = slug;
  }

  if (Object.keys(creatorUpdates).length > 0) {
    const { error } = await supabase
      .from("creators")
      .update(creatorUpdates)
      .eq("email", user.email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // creator_shops 테이블 업데이트
  const shopFields = ["tagline", "cover_url", "profile_url", "link_blocks", "theme"];
  const shopUpdates: Record<string, unknown> = {};
  for (const key of shopFields) {
    if (key in body) shopUpdates[key] = body[key];
  }

  if (Object.keys(shopUpdates).length > 0) {
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("email", user.email)
      .single();

    if (creator) {
      shopUpdates.updated_at = new Date().toISOString();
      await supabase
        .from("creator_shops")
        .update(shopUpdates)
        .eq("creator_id", creator.id);
    }
  }

  return NextResponse.json({ ok: true });
}
