/**
 * shop_slug 중복 검사 — 온보딩에서 사용자가 입력 시 즉시 확인.
 *
 * 본인이 이미 사용 중인 slug는 available로 간주 (변경 안 함).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.toLowerCase().trim();
  if (!slug) return NextResponse.json({ available: false, error: "slug required" }, { status: 400 });

  if (!/^[a-z0-9_-]{3,30}$/.test(slug)) {
    return NextResponse.json({ available: false, error: "형식 오류" });
  }

  // 예약어
  const RESERVED = ["admin", "api", "auth", "dashboard", "login", "signup", "shop", "settings", "onboarding", "tubeping", "www", "mail", "support"];
  if (RESERVED.includes(slug)) {
    return NextResponse.json({ available: false, error: "예약어" });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 본인 slug면 사용 가능
  if (user?.email) {
    const { data: me } = await supabase
      .from("creators")
      .select("shop_slug")
      .eq("email", user.email)
      .maybeSingle();
    if (me?.shop_slug === slug) {
      return NextResponse.json({ available: true, self: true });
    }
  }

  // 다른 사용자가 사용 중인지 확인
  const { data: existing } = await supabase
    .from("creators")
    .select("id")
    .eq("shop_slug", slug)
    .maybeSingle();

  return NextResponse.json({ available: !existing });
}
