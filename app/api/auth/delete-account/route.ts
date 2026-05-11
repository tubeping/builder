/**
 * 회원 탈퇴 — 본인 인증 후 creators + auth.users 영구 삭제.
 *
 * 보안:
 *   - 로그인 세션 필수 (anon + cookie)
 *   - 실제 삭제는 service_role 사용 (anon으로는 auth.users 삭제 불가)
 *   - service_role key 미설정 시 친절한 에러 (관리자 수동 처리)
 *
 * 삭제 범위:
 *   - creators 행 (CASCADE로 creator_shops, creator_picks, pick_clicks, campaigns 등 자동 정리)
 *   - auth.users 행
 *   - 외부 플랫폼 토큰 (instagram_accounts 등)
 *
 * 법령상 보관 데이터:
 *   - 결제·청약 기록 5년 (전자상거래법) — 별도 archive 테이블에서 익명화 후 보관
 *   - 접속 로그 3개월 (통신비밀보호법)
 *   현재는 단순 삭제. 결제 도입 시 archive 로직 추가 필요.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
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
  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      {
        error: "Service role key 미설정",
        detail: "회원 탈퇴 자동화 미구성 — master@shinsananalytics.com으로 탈퇴 요청 메일을 보내주세요. 영업일 기준 7일 이내 처리됩니다.",
      },
      { status: 503 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1. creators 행 삭제 (CASCADE)
    if (user.email) {
      await admin.from("creators").delete().eq("email", user.email);
    }

    // 2. auth.users 삭제
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return NextResponse.json({ error: `사용자 삭제 실패: ${delErr.message}` }, { status: 500 });
    }

    // 3. 로컬 세션 로그아웃
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "탈퇴 처리 중 오류" },
      { status: 500 }
    );
  }
}
