import { NextRequest, NextResponse } from "next/server";
import { generateHmac } from "@/lib/coupang-sign";

const DOMAIN = "https://api-gateway.coupang.com";
const PLATFORM_ACCESS_KEY = process.env.COUPANG_ACCESS_KEY || "";
const PLATFORM_SECRET_KEY = process.env.COUPANG_SECRET_KEY || "";

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword") || "";
  const limit = request.nextUrl.searchParams.get("limit") || "20";

  const userAccessKey = request.headers.get("x-coupang-access-key") || "";
  const userSecretKey = request.headers.get("x-coupang-secret-key") || "";
  const accessKey = userAccessKey || PLATFORM_ACCESS_KEY;
  const secretKey = userSecretKey || PLATFORM_SECRET_KEY;

  if (!keyword.trim()) {
    return NextResponse.json({ error: "검색어를 입력하세요" }, { status: 400 });
  }

  if (!accessKey || !secretKey) {
    return NextResponse.json({ error: "쿠팡 API 키 설정 필요" }, { status: 500 });
  }

  const path = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
  // 서명 + URL 모두 인코딩된 키워드 사용
  const encodedQuery = `keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const authorization = generateHmac("GET", path, encodedQuery, accessKey, secretKey);

  const res = await fetch(`${DOMAIN}${path}?${encodedQuery}`, {
    headers: { Authorization: authorization },
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: "쿠팡 API 오류", detail: errText },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
