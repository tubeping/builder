import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const CLIENT_ID = (process.env.CAFE24_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.CAFE24_CLIENT_SECRET || "").trim();
const MALL_ID = (process.env.CAFE24_MALL_ID || "tubeping").trim();
const API_VERSION = "2026-03-01";

async function getToken(): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("stores")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("mall_id", MALL_ID)
    .eq("status", "active")
    .limit(1)
    .single();

  if (error || !data) throw new Error(`stores에서 ${MALL_ID} 조회 실패`);

  const expiresAt = data.token_expires_at
    ? new Date(data.token_expires_at).getTime()
    : Date.now() + 2 * 60 * 60 * 1000;

  if (expiresAt > Date.now() + 60_000) {
    return data.access_token;
  }

  // 만료 임박 → 리프레시
  const res = await fetch(
    `https://${MALL_ID}.cafe24api.com/api/v2/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
      }),
    }
  );
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokenData = await res.json();

  await sb
    .from("stores")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  return tokenData.access_token;
}

export async function GET() {
  let token: string;
  try {
    token = await getToken();
  } catch (e) {
    return NextResponse.json(
      { error: "토큰 조회 실패", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://${MALL_ID}.cafe24api.com/api/v2/admin/categories?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": API_VERSION,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "카테고리 조회 실패" }, { status: res.status });
  }

  const data = await res.json();

  // 상품 카테고리만 허용 (tubeping 몰 기준)
  const ALLOWED_IDS = new Set([42, 46, 53, 47, 52, 51]);
  // 42=식품, 46=건강, 53=생활, 47=패션/뷰티, 52=캠핑/여행, 51=디지털/가전

  const categories = (data.categories || [])
    .filter((c: { parent_category_no: number; category_no: number }) =>
      c.parent_category_no === 1 && ALLOWED_IDS.has(c.category_no)
    )
    .map((c: { category_no: number; category_name: string }) => ({
      id: c.category_no,
      name: c.category_name.replace(/<[^>]*>/g, "").trim(),
    }));

  return NextResponse.json({ categories });
}
