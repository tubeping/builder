import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";
import { buildAuthorizationUrl } from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "meta_oauth_state";
const STATE_TTL_SEC = 600; // 10분

export async function GET() {
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
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/dm", process.env.META_OAUTH_REDIRECT_URI!).toString());
  }

  // CSRF 방어용 state
  const state = crypto.randomBytes(24).toString("base64url");
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SEC,
  });

  return NextResponse.redirect(buildAuthorizationUrl(state));
}
