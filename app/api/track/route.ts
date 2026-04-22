/**
 * 클릭 트래킹 엔드포인트 — 공개 몰에서 상품·링크 클릭 시 beacon.
 *
 * 클라이언트: navigator.sendBeacon("/api/track", JSON.stringify(payload))
 * 서버: Supabase anon key로 pick_clicks INSERT.
 *
 * 개인정보 처리: IP는 해시(SHA-256 앞 16자)만 저장. 원본 IP 저장 안 함.
 * RLS: anon INSERT 허용, 크리에이터 본인만 SELECT 허용 (pick_clicks 테이블 정책 참조).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

interface TrackPayload {
  slug: string;              // shop slug (필수)
  pickId?: string;
  sourceType?: string;       // tubeping_campaign/coupang/naver/own/link/direct
  targetUrl?: string;        // 이동할 외부 URL
  landingUrl?: string;       // 현재 페이지 URL (utm 포함)
}

function parseDevice(ua: string): string {
  if (!ua) return "unknown";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function hashIp(ip: string): string {
  if (!ip) return "";
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT || "tubeping")).digest("hex").slice(0, 16);
}

function parseUtm(url: string) {
  try {
    const u = new URL(url);
    return {
      utm_source: u.searchParams.get("utm_source") || null,
      utm_medium: u.searchParams.get("utm_medium") || null,
      utm_campaign: u.searchParams.get("utm_campaign") || null,
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

export async function POST(request: NextRequest) {
  let body: TrackPayload;
  try {
    const text = await request.text(); // sendBeacon은 텍스트로 옴
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  if (!body.slug) {
    return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });
  }

  // shop_slug → creator_id 매핑
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("shop_slug", body.slug)
    .maybeSingle();

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "";

  const utm = parseUtm(body.landingUrl || "");

  // 비동기 insert — 결과 기다리지 않고 즉시 응답 (beacon UX)
  supabase
    .from("pick_clicks")
    .insert({
      shop_slug: body.slug,
      creator_id: creator?.id || null,
      pick_id: body.pickId || null,
      source_type: body.sourceType || null,
      target_url: body.targetUrl || null,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      referrer: referrer || null,
      landing_url: body.landingUrl || null,
      user_agent: userAgent || null,
      device: parseDevice(userAgent),
      ip_hash: hashIp(ip),
    })
    .then(() => { /* fire and forget */ });

  return NextResponse.json({ ok: true });
}
