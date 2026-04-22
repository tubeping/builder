/**
 * 네이버 쇼핑 검색 API 프록시
 *
 * 네이버는 공식 "파트너스" API가 없지만, 네이버 쇼핑 검색 API로 상품 정보 조회 가능.
 * 파트너 커미션은 별도 네이버 검색광고/애드포스트에서 관리.
 *
 * 필요: .env에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * 발급: https://developers.naver.com/apps/ → 애플리케이션 등록 → 검색 API 사용
 *
 * 무료 한도: 일 25,000회
 */

import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = (process.env.NAVER_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.NAVER_CLIENT_SECRET || "").trim();

interface NaverShopItem {
  title: string;
  link: string;
  image: string;
  lprice: string;  // 최저가
  hprice: string;  // 최고가
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

interface NaverShopResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverShopItem[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query") || searchParams.get("keyword") || "";
  const display = searchParams.get("display") || "20";   // 1~100
  const start = searchParams.get("start") || "1";         // 1~1000
  const sort = searchParams.get("sort") || "sim";         // sim(정확도) / date / asc / dsc

  if (!query.trim()) {
    return NextResponse.json({ error: "검색어를 입력하세요" }, { status: 400 });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "네이버 API 키 설정 필요 (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    query,
    display,
    start,
    sort,
  });

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": CLIENT_ID,
          "X-Naver-Client-Secret": CLIENT_SECRET,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: "네이버 쇼핑 API 오류", detail: txt.slice(0, 200) },
        { status: res.status }
      );
    }

    const data: NaverShopResponse = await res.json();

    // 정규화: 프런트에서 쓰기 편한 형태로 변환
    const items = (data.items || []).map((it) => ({
      productId: it.productId,
      title: it.title.replace(/<\/?b>/g, ""), // <b> 하이라이트 태그 제거
      link: it.link,
      image: it.image,
      price: parseInt(it.lprice) || 0,
      maxPrice: parseInt(it.hprice) || 0,
      mallName: it.mallName,
      brand: it.brand,
      maker: it.maker,
      category: [it.category1, it.category2, it.category3, it.category4]
        .filter(Boolean)
        .join(" > "),
      productType: it.productType, // 1=일반/2=중고/3=단종/...
    }));

    return NextResponse.json(
      {
        total: data.total,
        start: data.start,
        display: data.display,
        items,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "네이버 API 호출 실패", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }
}
