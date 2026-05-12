/**
 * 가입 동의 audit 기록 — 법령상 입증 자료.
 *
 * /signup에서 약관 동의 완료 후 호출.
 * Supabase 가입 직전에 호출 (user_id는 null, 가입 후 매핑은 별도 cron이나 callback에서).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

interface ConsentPayload {
  email: string;
  age_14_consent: boolean;
  terms_consent: boolean;
  privacy_consent: boolean;
  marketing_consent?: boolean;
  signup_method: "google" | "email";
}

function hashIp(ip: string): string {
  if (!ip) return "";
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT || "tubeping"))
    .digest("hex")
    .slice(0, 16);
}

export async function POST(request: NextRequest) {
  let body: ConsentPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (!body.email || !body.age_14_consent || !body.terms_consent || !body.privacy_consent) {
    return NextResponse.json({ error: "필수 동의 누락" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const userAgent = request.headers.get("user-agent") || "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "";

  const { error } = await supabase.from("consent_audit").insert({
    email: body.email.toLowerCase().trim(),
    age_14_consent: body.age_14_consent,
    terms_consent: body.terms_consent,
    privacy_consent: body.privacy_consent,
    marketing_consent: body.marketing_consent ?? false,
    user_agent: userAgent || null,
    ip_hash: hashIp(ip),
    signup_method: body.signup_method,
    source: "signup",
  });

  if (error) {
    // 실패해도 가입은 계속 진행 — audit은 부수효과
    console.error("[consent_audit] insert failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
