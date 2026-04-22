/**
 * URL 메타데이터 추출 API (Open Graph / Twitter Card / 일반 메타)
 *
 * 링크만으로 상품을 등록할 때 사용:
 * - 이미지: og:image, twitter:image, <link rel="image_src">
 * - 제목: og:title, twitter:title, <title>
 * - 설명: og:description, twitter:description, meta description
 * - 가격: og:price:amount, product:price:amount, schema.org Product
 * - 사이트명: og:site_name
 *
 * 차단/리다이렉트 많은 쿠팡/네이버스토어 같은 곳은 일부 메타만 잡힐 수 있음.
 */

import { NextRequest, NextResponse } from "next/server";

interface UnfurlResult {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  price?: number;
  currency?: string;
  favicon?: string;
}

// 작은 HTML 파서: <meta>와 <title>만 빠르게 추출
function extractMeta(html: string, url: string): UnfurlResult {
  const head = html.slice(0, 200_000); // 앞 200KB만 파싱 (메타는 <head>에 있음)

  // <meta property=".." content="..." />
  const metaRegex = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  // content가 property보다 먼저 오는 케이스도 대응
  const metaRegexRev = /<meta\s+[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*>/gi;

  const meta: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(head)) !== null) {
    meta[m[1].toLowerCase()] = m[2];
  }
  while ((m = metaRegexRev.exec(head)) !== null) {
    const key = m[2].toLowerCase();
    if (!meta[key]) meta[key] = m[1];
  }

  // <title>
  const titleMatch = head.match(/<title[^>]*>([^<]+)<\/title>/i);

  // favicon
  const faviconMatch = head.match(
    /<link\s+[^>]*rel\s*=\s*["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*href\s*=\s*["']([^"']+)["']/i
  );

  // schema.org Product (JSON-LD)
  let jsonLdPrice: number | undefined;
  const ldMatch = head.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const offers = ld.offers || (Array.isArray(ld) ? ld[0]?.offers : undefined);
      if (offers) {
        const rawPrice = Array.isArray(offers) ? offers[0]?.price : offers.price;
        const p = Number(rawPrice);
        if (!isNaN(p)) jsonLdPrice = p;
      }
    } catch { /* ignore */ }
  }

  // URL 절대경로 변환
  const absolutize = (v?: string) => {
    if (!v) return "";
    if (v.startsWith("//")) return "https:" + v;
    if (v.startsWith("http")) return v;
    try {
      return new URL(v, url).href;
    } catch {
      return v;
    }
  };

  const priceRaw =
    meta["og:price:amount"] ||
    meta["product:price:amount"] ||
    meta["twitter:data1"] ||
    "";
  const parsedPrice = priceRaw ? Number(priceRaw.replace(/[^0-9.]/g, "")) : NaN;
  const price = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : jsonLdPrice;

  return {
    url,
    title: (meta["og:title"] || meta["twitter:title"] || titleMatch?.[1] || "").trim().slice(0, 200),
    description: (meta["og:description"] || meta["twitter:description"] || meta["description"] || "")
      .trim()
      .slice(0, 400),
    image: absolutize(meta["og:image"] || meta["twitter:image"] || ""),
    siteName: meta["og:site_name"] || new URL(url).hostname,
    price,
    currency: meta["og:price:currency"] || meta["product:price:currency"] || "KRW",
    favicon: absolutize(faviconMatch?.[1]),
  };
}

// 일반 브라우저 UA로 위장
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
};

async function fetchWithTimeout(u: string, signal?: AbortSignal) {
  return fetch(u, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: signal || AbortSignal.timeout(8000),
  });
}

/**
 * 네이버 브랜드커넥트 URL에서 channelProductNo 파싱 → 스마트스토어 상품 페이지 URL로 재구성
 * 예: brandconnect.naver.com/affiliates/944311184274112?channelProductNo=9102118112
 *  → smartstore.naver.com/main/products/9102118112 (네이버가 실제 스토어로 자동 리다이렉트)
 */
function resolveNaverProductUrl(finalUrl: string): string | null {
  try {
    const u = new URL(finalUrl);
    if (u.hostname.includes("brandconnect.naver")) {
      const productNo = u.searchParams.get("channelProductNo");
      if (productNo) {
        return `https://smartstore.naver.com/main/products/${productNo}`;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });
  }

  // 기본 검증
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("bad protocol");
    }
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL" }, { status: 400 });
  }

  try {
    let res = await fetchWithTimeout(url);

    // 네이버 브랜드커넥트로 리다이렉트됐으면 channelProductNo로 스마트스토어 재시도
    const bcProductUrl = resolveNaverProductUrl(res.url || url);
    if (bcProductUrl) {
      try {
        const retry = await fetchWithTimeout(bcProductUrl);
        // 429/실패 시 기존 응답 유지
        if (retry.ok && (retry.headers.get("content-type") || "").includes("text/html")) {
          res = retry;
        }
      } catch { /* 재시도 실패 — 원본 응답 사용 */ }
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `원본 페이지 응답 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json({ error: "HTML 페이지가 아닙니다" }, { status: 400 });
    }

    const html = await res.text();
    const meta = extractMeta(html, res.url || url);

    return NextResponse.json(meta, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "페이지 분석 실패", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }
}
