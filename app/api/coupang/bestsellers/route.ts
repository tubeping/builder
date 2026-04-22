/**
 * 쿠팡 파트너스 카테고리별 베스트셀러 프록시
 *
 * 플랫폼 공용 API 키(환경변수)로 카테고리별 랭킹 상품을 가져와
 * 크리에이터가 연동 전에도 상품을 미리 볼 수 있게 함.
 * 개인 키는 "링크 생성(deeplink)" 시점에만 필요.
 *
 * 환경변수:
 *   COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY  (플랫폼 공용)
 *
 * 쿠팡 파트너스 카테고리 ID:
 *   1001 여성패션  1002 남성패션  1010 뷰티  1011 출산/유아동
 *   1012 식품      1013 주방용품  1014 생활용품  1015 홈인테리어
 *   1016 가전디지털 1017 스포츠/레저  1018 자동차용품
 *   1019 도서/음반  1020 완구/취미  1021 문구/오피스
 *   1024 헬스/건강  1025 국내여행   1026 해외여행
 *   1029 반려동물용품
 */

import { NextRequest, NextResponse } from "next/server";
import { generateHmac } from "@/lib/coupang-sign";

const DOMAIN = "https://api-gateway.coupang.com";
const PLATFORM_ACCESS_KEY = (process.env.COUPANG_ACCESS_KEY || "").trim();
const PLATFORM_SECRET_KEY = (process.env.COUPANG_SECRET_KEY || "").trim();

// In-memory 캐시 (카테고리별 1시간 TTL)
type CacheEntry = { data: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get("categoryId") || "0";  // 0 = 전체
  const limit = searchParams.get("limit") || "30";
  const imageSize = searchParams.get("imageSize") || "512x512";

  // 크리에이터 개인 키가 있으면 우선 사용 (트래킹 정확성)
  const userAccessKey = request.headers.get("x-coupang-access-key") || "";
  const userSecretKey = request.headers.get("x-coupang-secret-key") || "";
  const accessKey = userAccessKey || PLATFORM_ACCESS_KEY;
  const secretKey = userSecretKey || PLATFORM_SECRET_KEY;

  if (!accessKey || !secretKey) {
    return NextResponse.json(
      { error: "쿠팡 API 키 설정 필요 (COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY)" },
      { status: 500 }
    );
  }

  // 캐시 히트 (플랫폼 키 사용 시에만)
  const cacheKey = `best::${categoryId}::${limit}::${imageSize}::${userAccessKey ? "user" : "platform"}`;
  if (!userAccessKey) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return NextResponse.json(hit.data, {
        headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }
  }

  // 전체(0)는 keyword 없이 카테고리 조회 불가 → 대안: 카테고리 목록 전체 순회는 비용↑
  // 대신 "전체"는 특정 대표 카테고리(식품)로 대체 or 다른 엔드포인트 사용.
  // 쿠팡은 전역 베스트가 없어서 카테고리별로만 제공. categoryId=0이면 1012(식품) 기본.
  const realCatId = categoryId === "0" ? "1012" : categoryId;

  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/bestcategories/${realCatId}`;
  const query = `limit=${limit}&imageSize=${imageSize}`;
  const authorization = generateHmac("GET", path, query, accessKey, secretKey);

  try {
    const res = await fetch(`${DOMAIN}${path}?${query}`, {
      method: "GET",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json;charset=UTF-8",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: "쿠팡 API 오류", detail: txt.slice(0, 300) },
        { status: res.status }
      );
    }

    const raw = await res.json();
    // 정규화: 프런트에서 쓰기 편한 형태
    const items = (raw.data || []).map((p: Record<string, unknown>, idx: number) => ({
      rank: idx + 1,
      productId: p.productId,
      productName: p.productName,
      productPrice: Number(p.productPrice) || 0,
      productImage: p.productImage,
      productUrl: p.productUrl,
      categoryName: p.categoryName,
      isRocket: Boolean(p.isRocket),
      isFreeShipping: Boolean(p.isFreeShipping),
    }));

    const result = { categoryId: realCatId, count: items.length, items };

    // 플랫폼 키로 얻은 결과만 캐싱 (개인 키 결과는 tracking id 달라져서 캐싱 X)
    if (!userAccessKey) {
      cache.set(cacheKey, { data: result, expiresAt: Date.now() + TTL_MS });
      if (cache.size > 50) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
    }

    return NextResponse.json(result, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "쿠팡 API 호출 실패", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }
}
