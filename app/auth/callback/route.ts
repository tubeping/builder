import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * OAuth/Email 인증 콜백 — Supabase에서 코드 교환 후 next 파라미터로 리다이렉트.
 *
 * 신규 사용자(creators 테이블에 없는 경우): /onboarding으로 강제 이동
 * 기존 사용자: next 파라미터(기본 /dashboard)로 이동
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionErr || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(sessionErr?.message || "auth_failed")}`);
  }

  const user = sessionData.user;

  // 로그인 이벤트 로그 (fire-and-forget)
  const userAgent = request.headers.get("user-agent") || "";
  const provider = user.app_metadata?.provider || "email";
  void fetch(`${origin}/api/auth/log-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": userAgent },
    body: JSON.stringify({
      email: user.email || "",
      event_type: "login_success",
      method: provider === "google" ? "google" : "email",
      user_id: user.id,
    }),
  }).catch(() => { /* swallow */ });

  // creators 테이블에 행이 없으면 신규 — 자동 생성 + 온보딩 강제
  const { data: existing } = await supabase
    .from("creators")
    .select("id, shop_slug")
    .eq("email", user.email)
    .maybeSingle();

  if (!existing) {
    // 신규: 기본 행 삽입 (shop_slug는 onboarding에서 사용자가 정하게)
    const userMeta = user.user_metadata || {};
    const tempName = (userMeta.name as string)
      || (userMeta.full_name as string)
      || (user.email?.split("@")[0])
      || "신규 크리에이터";

    await supabase.from("creators").insert({
      email: user.email,
      name: tempName,
      shop_slug: null,  // onboarding 완료 시 입력
      platform: null,
      channel_url: null,
    });

    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // shop_slug 미설정이면 온보딩 미완료 — 강제 이동
  if (!existing.shop_slug) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // 기존 사용자 — next 경로로
  return NextResponse.redirect(`${origin}${next}`);
}
