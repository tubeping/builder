import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const CLIENT_ID = (process.env.CAFE24_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.CAFE24_CLIENT_SECRET || "").trim();
const MALL_ID = process.env.CAFE24_MALL_ID || "tubeping";
const API_VERSION = "2026-03-01";

// 메모리 캐시 (Serverless 인스턴스 내 재사용)
let tokenCache: { access: string; refresh: string; expiresAt: number; storeId: string } | null = null;

async function getTokenFromDB() {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("stores")
    .select("id, mall_id, access_token, refresh_token, token_expires_at")
    .eq("mall_id", MALL_ID)
    .eq("status", "active")
    .limit(1)
    .single();

  if (error || !data) throw new Error(`stores에서 ${MALL_ID} 조회 실패: ${error?.message}`);
  return data;
}

async function getToken(): Promise<string> {
  // 메모리 캐시 유효하면 재사용
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.access;
  }

  // DB에서 토큰 로드
  const store = await getTokenFromDB();
  const expiresAt = store.token_expires_at
    ? new Date(store.token_expires_at).getTime()
    : Date.now() + 2 * 60 * 60 * 1000;

  // DB 토큰이 아직 유효하면 사용
  if (expiresAt > Date.now() + 60_000) {
    tokenCache = {
      access: store.access_token,
      refresh: store.refresh_token,
      expiresAt,
      storeId: store.id,
    };
    return store.access_token;
  }

  // 만료 임박 → 리프레시
  return refreshToken(store.id, store.refresh_token);
}

async function refreshToken(storeId: string, refreshTkn: string): Promise<string> {
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
        refresh_token: refreshTkn,
      }),
    }
  );

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = await res.json();

  // 메모리 캐시 업데이트
  tokenCache = {
    access: data.access_token,
    refresh: data.refresh_token,
    expiresAt: new Date(data.expires_at).getTime(),
    storeId,
  };

  // DB 업데이트
  const sb = getServiceClient();
  await sb
    .from("stores")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: data.expires_at,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  return data.access_token;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = searchParams.get("limit") || "100";
  const offset = searchParams.get("offset") || "0";
  const keyword = searchParams.get("keyword") || "";
  const category = searchParams.get("category") || "";

  let token: string;
  try {
    token = await getToken();
  } catch (e) {
    return NextResponse.json(
      { error: "토큰 조회 실패", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({ limit, offset });
  if (keyword) params.set("product_name", keyword);
  if (category) params.set("category", category);

  const doFetch = async (tkn: string) =>
    fetch(`https://${MALL_ID}.cafe24api.com/api/v2/admin/products?${params}`, {
      headers: {
        Authorization: `Bearer ${tkn}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": API_VERSION,
      },
    });

  let res = await doFetch(token);

  // 401이면 DB에서 최신 토큰 다시 가져와서 재시도
  if (res.status === 401) {
    try {
      const store = await getTokenFromDB();
      const newToken = await refreshToken(store.id, store.refresh_token);
      res = await doFetch(newToken);
    } catch {
      return NextResponse.json({ error: "카페24 인증 실패 — 토큰 재발급 필요" }, { status: 401 });
    }
  }

  if (!res.ok) {
    return NextResponse.json({ error: "카페24 API 오류" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
