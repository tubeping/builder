/**
 * Headless Chrome 기반 URL 메타 추출
 *
 * JS 렌더링이 필요한 페이지(네이버 브랜드커넥트 등) 대응.
 * Vercel Serverless + @sparticuz/chromium-min + puppeteer-core.
 *
 * 사용:
 *   GET /api/unfurl-headless?url=https://naver.me/52aMLu6j
 *
 * 참고: cold start 3~5초, 실제 페이지 렌더 1~3초. 반드시 캐싱.
 */

import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { Browser } from "puppeteer-core";

// Vercel 함수 timeout (30초 권장, max 60초 on Pro)
export const maxDuration = 30;

// @sparticuz/chromium-min은 외부 호스팅된 chromium 바이너리 사용
const CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar";

// In-memory 캐시 (URL별 24시간)
type CacheEntry = { data: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000;

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  const isLocal = process.env.VERCEL !== "1" && !process.env.AWS_EXECUTION_ENV;

  if (isLocal) {
    // 로컬 개발: 시스템에 설치된 Chrome/Edge 사용
    _browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : "/usr/bin/google-chrome",
    });
  } else {
    // Vercel/서버리스: @sparticuz/chromium-min
    _browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK),
      headless: true,
    });
  }
  return _browser!;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });
  }

  // URL 기본 검증
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("bad protocol");
    }
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL" }, { status: 400 });
  }

  // 캐시 히트
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: {
        "X-Cache": "HIT",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  let browser: Browser | null = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // 봇 감지 우회
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    });

    // 페이지 이동 (리다이렉트 자동 추적)
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // JS 렌더링 대기 (네이버 브랜드커넥트 같은 SPA 대응)
    // og:title/og:image가 dynamic하게 주입될 수 있어 최대 5초 대기
    await page
      .waitForFunction(
        () => {
          const title =
            document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
            document.title;
          const image = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
          // 최소 title 있거나 이미지 있거나 1초 지났으면 OK
          return (title && !/네이버\s*브랜드\s*커넥트/i.test(title)) || !!image;
        },
        { timeout: 5000 }
      )
      .catch(() => { /* 타임아웃 — 있는 정보만이라도 */ });

    // OG 메타 및 JSON-LD 추출
    const meta = await page.evaluate(() => {
      const getMeta = (prop: string) => {
        const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
        return el?.getAttribute("content") || "";
      };

      // JSON-LD Product offers.price
      let jsonLdPrice = 0;
      const ldEl = document.querySelector('script[type="application/ld+json"]');
      if (ldEl?.textContent) {
        try {
          const ld = JSON.parse(ldEl.textContent);
          const offers = ld.offers || (Array.isArray(ld) ? ld[0]?.offers : null);
          const p = offers && (Array.isArray(offers) ? offers[0]?.price : offers.price);
          const n = Number(p);
          if (!isNaN(n)) jsonLdPrice = n;
        } catch { /* ignore */ }
      }

      const priceStr =
        getMeta("product:price:amount") ||
        getMeta("og:price:amount") ||
        getMeta("twitter:data1") ||
        "";
      const parsedPrice = priceStr ? Number(priceStr.replace(/[^0-9.]/g, "")) : NaN;
      const price = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : jsonLdPrice;

      return {
        url: window.location.href,
        title: getMeta("og:title") || document.title,
        image: getMeta("og:image") || getMeta("twitter:image") || "",
        description: getMeta("og:description") || "",
        price,
        siteName: getMeta("og:site_name") || window.location.hostname,
        currency: getMeta("og:price:currency") || "KRW",
      };
    });

    await page.close();

    // 캐시 저장
    cache.set(url, { data: meta, expiresAt: Date.now() + TTL_MS });
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    return NextResponse.json(meta, {
      headers: {
        "X-Cache": "MISS",
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
