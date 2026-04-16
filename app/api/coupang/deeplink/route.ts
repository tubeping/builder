import { NextRequest, NextResponse } from "next/server";
import { generateHmac } from "@/lib/coupang-sign";

const DOMAIN = "https://api-gateway.coupang.com";

export async function POST(request: NextRequest) {
  const accessKey = request.headers.get("x-coupang-access-key") || "";
  const secretKey = request.headers.get("x-coupang-secret-key") || "";
  const { urls } = await request.json();

  if (!accessKey || !secretKey) {
    return NextResponse.json({ error: "쿠팡 파트너스 키가 필요합니다" }, { status: 401 });
  }

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "URL이 필요합니다" }, { status: 400 });
  }

  const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";
  const authorization = generateHmac("POST", path, "", accessKey, secretKey);

  const res = await fetch(`${DOMAIN}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coupangUrls: urls }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: "딥링크 생성 실패", detail: errText },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
