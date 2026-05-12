/**
 * 로그인 활동 로그 기록.
 *
 * 호출 시점:
 *   - /auth/callback: login_success / signup (method + 신규 여부)
 *   - /login: login_failed
 *   - 대시보드 로그아웃: logout
 *   - /forgot-password: password_reset
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

interface LogPayload {
  email: string;
  event_type: "login_success" | "login_failed" | "logout" | "password_reset" | "signup";
  method?: "google" | "email" | "recovery";
  user_id?: string;
  error_message?: string;
}

function hashIp(ip: string): string {
  if (!ip) return "";
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT || "tubeping"))
    .digest("hex")
    .slice(0, 16);
}

function parseDevice(ua: string): string {
  if (!ua) return "unknown";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(request: NextRequest) {
  let body: LogPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.email || !body.event_type) {
    return NextResponse.json({ ok: false, error: "email, event_type 필수" }, { status: 400 });
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

  // 비동기 — 응답 즉시 반환
  supabase.from("auth_login_logs").insert({
    user_id: body.user_id || null,
    email: body.email.toLowerCase().trim(),
    event_type: body.event_type,
    method: body.method || null,
    ip_hash: hashIp(ip),
    user_agent: userAgent || null,
    device: parseDevice(userAgent),
    error_message: body.error_message || null,
  }).then(() => { /* fire-and-forget */ });

  return NextResponse.json({ ok: true });
}
