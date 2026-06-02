import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exchangeCodeForToken, exchangeForLongLivedToken, getMe, subscribeWebhookFields, MetaApiError } from "@/lib/meta/client";
import { encryptToken } from "@/lib/meta/crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "meta_oauth_state";
const DASHBOARD_URL = "/dashboard/dm";

function errorRedirect(reason: string): NextResponse {
  const url = new URL(DASHBOARD_URL, process.env.META_OAUTH_REDIRECT_URI!);
  url.searchParams.set("meta_error", reason);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return errorRedirect(`meta_denied:${oauthError}`);
  }
  if (!code || !state) {
    return errorRedirect("missing_code");
  }

  // 1) state 검증 (CSRF 방어)
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  if (!savedState || savedState !== state) {
    return errorRedirect("invalid_state");
  }
  cookieStore.delete(STATE_COOKIE);

  // 2) 인증된 크리에이터 확인
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
  if (!user?.email) return errorRedirect("unauthorized");

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (!creator) return errorRedirect("creator_not_found");

  try {
    // 3) code → short-lived token
    const shortLived = await exchangeCodeForToken(code, process.env.META_OAUTH_REDIRECT_URI!);

    // 4) short-lived → long-lived (60일)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    // 5) 사용자 정보 조회
    const me = await getMe(longLived.access_token);
    const igUserId = me.user_id ?? me.id;

    // 6) 토큰 암호화 + 저장
    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString();
    const longLivedEnc = encryptToken(longLived.access_token);

    // Instagram Business Login 플로우에서는 page_access_token == long-lived token 으로 사용 가능
    // (instagram_business_basic 권한 기반)
    const { error: upsertError } = await supabaseAdmin
      .from("meta_connections")
      .upsert(
        {
          creator_id: creator.id,
          ig_user_id: igUserId,
          ig_username: me.username,
          page_id: igUserId, // 본 플로우에서는 동일
          page_name: me.name ?? me.username,
          long_lived_token_encrypted: longLivedEnc,
          page_access_token_encrypted: longLivedEnc,
          token_expires_at: tokenExpiresAt,
          active: true,
          last_refreshed_at: new Date().toISOString(),
          refresh_failure_count: 0,
        },
        { onConflict: "ig_user_id" }
      );

    if (upsertError) {
      console.error("[meta.oauth.callback] upsert failed", upsertError);
      return errorRedirect("db_save_failed");
    }

    // 7) Webhook 필드 구독 (best effort, 실패해도 연결은 유지)
    try {
      await subscribeWebhookFields(igUserId, longLived.access_token, "comments,messages");
      await supabaseAdmin
        .from("meta_connections")
        .update({ webhook_subscribed: true })
        .eq("ig_user_id", igUserId);
    } catch (e) {
      console.warn("[meta.oauth.callback] webhook subscribe failed (non-fatal)", e);
    }

    // 8) 성공 redirect
    const successUrl = new URL(DASHBOARD_URL, process.env.META_OAUTH_REDIRECT_URI!);
    successUrl.searchParams.set("meta_connected", me.username);
    return NextResponse.redirect(successUrl.toString());

  } catch (e) {
    if (e instanceof MetaApiError) {
      console.error("[meta.oauth.callback] MetaApiError", e.status, e.payload);
      return errorRedirect(`meta_api:${e.status}`);
    }
    console.error("[meta.oauth.callback] unexpected", e);
    return errorRedirect("unexpected");
  }
}
