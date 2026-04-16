import { NextResponse } from "next/server";

const MALL_ID = process.env.CAFE24_MALL_ID || "";
const CLIENT_ID = process.env.CAFE24_CLIENT_ID || "";
const CLIENT_SECRET = process.env.CAFE24_CLIENT_SECRET || "";
const API_VERSION = "2026-03-01";

let cachedToken = {
  access: process.env.CAFE24_ACCESS_TOKEN || "",
  refresh: process.env.CAFE24_REFRESH_TOKEN || "",
  expiresAt: Date.now() + 2 * 60 * 60 * 1000,
};

async function refreshToken(): Promise<string> {
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
        refresh_token: cachedToken.refresh,
      }),
    }
  );
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  cachedToken = {
    access: data.access_token,
    refresh: data.refresh_token,
    expiresAt: new Date(data.expires_at).getTime(),
  };
  return data.access_token;
}

async function getToken(): Promise<string> {
  if (cachedToken.access && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.access;
  }
  return refreshToken();
}

export async function GET() {
  const token = await getToken();

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
