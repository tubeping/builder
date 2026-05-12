/**
 * Headless Chrome 기반 URL 메타 추출 (v2: 사이트별 파서)
 *
 * 흐름:
 *   1) URL 정규화 → in-memory 캐시 조회
 *   2) 캐시 MISS → puppeteer로 페이지 로드 (리다이렉트 자동 추적)
 *   3) 최종 URL의 도메인 → 사이트별 파서 선택
 *      - smartstore.naver.com → 전용 파서 (JSON-LD + 본문 셀렉터 + OG)
 *      - aliexpress.com / s.click.aliexpress.com → 전용 파서
 *      - 그 외 (쿠팡 포함) → 기본 OG/JSON-LD 파서
 *   4) 이미지 후보 다중 수집 → placeholder/1px gif/logo 필터링
 *   5) 캐시 저장 (정규화 URL 키 · 24h TTL)
 *
 * 어필리에이트 URL 보존:
 *   응답의 `url` 필드는 최종 리다이렉트 후 URL (디버그용). 클라이언트는
 *   사용자 입력 원본을 그대로 `external_url`에 저장해야 어필리에이트 수익이
 *   안 깨짐. 이 라우트는 메타 추출 전용.
 */

import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { Browser, Page } from "puppeteer-core";

export const maxDuration = 30;

const CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar";

interface UnfurlResult {
  url: string;            // 최종 리다이렉트 후 URL (사용자 입력 원본과 다를 수 있음 — 어필리에이트 보존을 위해 클라는 무시)
  title: string;
  image: string;          // 가장 유력한 메인 이미지
  imageCandidates: string[]; // 유효 검증 통과한 후보들 (사용자가 다른 이미지 고르고 싶을 때 활용 가능)
  description: string;
  price: number;
  siteName: string;
  currency: string;
  via: string;            // 어떤 파서가 사용됐는지 (debug)
  blocked?: boolean;      // 사이트가 자동 접근을 차단한 경우 (에러 페이지 감지)
  blockedReason?: string; // 차단된 이유 (사용자에게 보여줄 메시지)
}

// 사이트가 차단했음을 알리는 에러 페이지 패턴
const BLOCKED_PATTERNS = [
  /\[에러\]/i,
  /시스템\s*오류/i,
  /에러\s*페이지/i,
  /access\s*denied/i,
  /please\s*verify\s*you\s*are/i,
  /captcha/i,
  /403\s*forbidden/i,
  /접근이\s*차단/i,
  /비정상적인\s*접근/i,
];

function detectBlocked(title: string, description: string): { blocked: boolean; reason: string } {
  const combined = `${title} ${description}`.trim();
  for (const re of BLOCKED_PATTERNS) {
    if (re.test(combined)) {
      return { blocked: true, reason: `사이트가 자동 접근을 차단했어요 — "${title.slice(0, 40)}"` };
    }
  }
  return { blocked: false, reason: "" };
}

type CacheEntry = { data: UnfurlResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000;

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;
  const isLocal = process.env.VERCEL !== "1" && !process.env.AWS_EXECUTION_ENV;
  if (isLocal) {
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
    _browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK),
      headless: true,
    });
  }
  return _browser!;
}

// URL 정규화 — 캐시 적중률 향상용 추적 파라미터 제거
function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    const STRIP = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "aff_id", "aff_trace_key", "aff_platform", "aff_request_id", "aff_short_key",
      "source", "ref", "from", "tt_from", "_track_t",
      "gclid", "fbclid", "msclkid",
    ];
    for (const k of STRIP) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return input;
  }
}

// 이미지 URL이 placeholder/로고/1px이 아닌지 휴리스틱 판정
function isLikelyValidImage(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  // 흔한 placeholder 파일명 패턴
  if (/\b(blank|spacer|placeholder|loading|logo|no[-_]?image|empty|transparent|favicon)\.(gif|png|jpg|jpeg|webp|svg|ico)\b/i.test(url)) return false;
  // 1x1 tracking pixel
  if (/\b1x1\.(gif|png)\b/i.test(url)) return false;
  if (/pixel\.(gif|png)/i.test(url)) return false;
  if (/[?&](w|width|size)=1(&|$)/i.test(url)) return false;
  // data URL은 자동 추출에서 제외 (큰 인라인이면 그대로 통과시켜도 되지만 의도치 않은 경우 많음)
  if (/^data:/i.test(url)) return false;
  return true;
}

// 도메인 → 파서 이름
function pickParserName(url: string): "smartstore" | "aliexpress" | "generic" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith("smartstore.naver.com")) return "smartstore";
    if (
      host === "aliexpress.com" ||
      host.endsWith(".aliexpress.com") ||
      host.endsWith("s.click.aliexpress.com")
    ) return "aliexpress";
    return "generic";
  } catch {
    return "generic";
  }
}

// ───────────────────────────────────────────────────
// 파서들 — 모두 page.evaluate 안에서 실행되어 candidates 배열을 반환
// ───────────────────────────────────────────────────

interface ParseRaw {
  title: string;
  candidates: string[];
  price: number;
  currency: string;
  description: string;
  siteName: string;
}

async function parseSmartStore(page: Page): Promise<ParseRaw> {
  return page.evaluate(() => {
    let title = "";
    const candidates: string[] = [];
    let price = 0;
    let currency = "KRW";
    let description = "";

    const og = (prop: string) =>
      document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)?.getAttribute("content") || "";

    // 1) JSON-LD Product 우선
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    ldScripts.forEach((ld) => {
      try {
        const data = JSON.parse(ld.textContent || "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const t = item["@type"];
          const types = Array.isArray(t) ? t : [t];
          if (types.includes("Product")) {
            if (item.name && !title) title = String(item.name);
            if (item.description && !description) description = String(item.description);
            if (item.image) {
              const imgs = Array.isArray(item.image) ? item.image : [item.image];
              for (const img of imgs) if (typeof img === "string") candidates.push(img);
            }
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offers) {
              const p = Number(offers.price ?? offers.lowPrice);
              if (!isNaN(p) && p > 0) price = p;
              if (offers.priceCurrency) currency = String(offers.priceCurrency);
            }
          }
        }
      } catch { /* ignore */ }
    });

    // 2) 본문 셀렉터 (스마트스토어 메인 이미지)
    const selectors = [
      ".product_image_thumb img",
      ".bd_thumb img",
      "[class*='ThumbnailList'] img",
      "[class*='product'][class*='thumb'] img",
      "[class*='product'][class*='image'] img",
      "[class*='ProductImage'] img",
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const src = (el as HTMLImageElement).src;
        if (src) candidates.push(src);
      });
    });

    // 3) OG/Twitter 메타 (최후 fallback)
    const ogImage = og("og:image:secure_url") || og("og:image");
    if (ogImage) candidates.push(ogImage);

    if (!title) title = og("og:title") || document.title;
    if (!description) description = og("og:description");

    return {
      title,
      candidates,
      price,
      currency,
      description,
      siteName: "네이버 스마트스토어",
    };
  });
}

async function parseAliExpress(page: Page): Promise<ParseRaw> {
  return page.evaluate(() => {
    let title = "";
    const candidates: string[] = [];
    let price = 0;
    let currency = "USD";
    let description = "";

    const og = (prop: string) =>
      document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)?.getAttribute("content") || "";

    // JSON-LD
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    ldScripts.forEach((ld) => {
      try {
        const data = JSON.parse(ld.textContent || "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const t = item["@type"];
          const types = Array.isArray(t) ? t : [t];
          if (types.includes("Product")) {
            if (item.name && !title) title = String(item.name);
            if (item.description && !description) description = String(item.description);
            if (item.image) {
              const imgs = Array.isArray(item.image) ? item.image : [item.image];
              for (const img of imgs) if (typeof img === "string") candidates.push(img);
            }
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offers) {
              const p = Number(offers.price ?? offers.lowPrice);
              if (!isNaN(p) && p > 0) price = p;
              if (offers.priceCurrency) currency = String(offers.priceCurrency);
            }
          }
        }
      } catch { /* ignore */ }
    });

    // 본문 셀렉터 (Ali 페이지 메인 이미지)
    const selectors = [
      ".image-view img",
      ".product-image-main img",
      "[class*='MainBigPic'] img",
      "[class*='image-thumb'] img",
      "[class*='magnifier'] img",
      "img[data-role='img']",
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const src = (el as HTMLImageElement).src;
        if (src) candidates.push(src);
      });
    });

    // OG 메타
    const ogImage = og("og:image:secure_url") || og("og:image");
    if (ogImage) candidates.push(ogImage);

    if (!title) title = og("og:title") || document.title;
    if (!description) description = og("og:description");

    // 가격 fallback: og:price:amount
    if (!price) {
      const p = Number(og("product:price:amount") || og("og:price:amount"));
      if (!isNaN(p) && p > 0) price = p;
    }

    return {
      title,
      candidates,
      price,
      currency,
      description,
      siteName: "AliExpress",
    };
  });
}

async function parseGenericOG(page: Page): Promise<ParseRaw> {
  return page.evaluate(() => {
    let title = "";
    const candidates: string[] = [];
    let price = 0;
    let currency = "KRW";
    let description = "";

    const og = (prop: string) =>
      document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)?.getAttribute("content") || "";

    // JSON-LD Product (있으면 우선)
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    ldScripts.forEach((ld) => {
      try {
        const data = JSON.parse(ld.textContent || "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const t = item["@type"];
          const types = Array.isArray(t) ? t : [t];
          if (types.includes("Product")) {
            if (item.name && !title) title = String(item.name);
            if (item.description && !description) description = String(item.description);
            if (item.image) {
              const imgs = Array.isArray(item.image) ? item.image : [item.image];
              for (const img of imgs) if (typeof img === "string") candidates.push(img);
            }
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offers) {
              const p = Number(offers.price ?? offers.lowPrice);
              if (!isNaN(p) && p > 0) price = p;
              if (offers.priceCurrency) currency = String(offers.priceCurrency);
            }
          }
        }
      } catch { /* ignore */ }
    });

    // OG/Twitter
    const ogImage = og("og:image:secure_url") || og("og:image");
    if (ogImage) candidates.push(ogImage);
    const twImage = og("twitter:image") || og("twitter:image:src");
    if (twImage) candidates.push(twImage);

    // 본문에서 큰 이미지 한두 개 (300px 이상)
    Array.from(document.querySelectorAll("img"))
      .slice(0, 30) // 첫 30개만 확인 (성능)
      .forEach((img) => {
        const el = img as HTMLImageElement;
        const w = el.naturalWidth || el.width || 0;
        if (w >= 300 && el.src) candidates.push(el.src);
      });

    if (!title) title = og("og:title") || document.title;
    description = description || og("og:description");

    // 가격 fallback
    if (!price) {
      const p = Number(og("product:price:amount") || og("og:price:amount") || og("twitter:data1"));
      if (!isNaN(p) && p > 0) price = p;
    }

    const siteName = og("og:site_name") || window.location.hostname;
    return { title, candidates, price, currency, description, siteName };
  });
}

// ───────────────────────────────────────────────────
// 핸들러
// ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL" }, { status: 400 });
  }

  const cacheKey = normalizeUrl(url);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  }

  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // 봇 감지 우회 — UA + 정교한 client hints (네이버/쿠팡 등 엄격한 사이트 대응)
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Ch-Ua": '"Chromium";v="124", "Not:A-Brand";v="24", "Google Chrome";v="124"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    // navigator.webdriver 제거 (간단한 stealth)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      // Chrome runtime spoof
      // @ts-expect-error - test stub
      window.chrome = window.chrome || { runtime: {} };
    });

    // 페이지 로드 (리다이렉트 자동 추적)
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // JS 렌더 대기 (SPA 대응): title/og:image/JSON-LD 중 하나라도 있으면 진행
    await page
      .waitForFunction(
        () => {
          const t =
            document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
            document.title;
          const i = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
          const hasLD = !!document.querySelector('script[type="application/ld+json"]');
          return (t && !/네이버\s*브랜드\s*커넥트/i.test(t)) || !!i || hasLD;
        },
        { timeout: 5000 }
      )
      .catch(() => { /* 타임아웃 — 있는 정보만이라도 */ });

    // 최종 URL → 파서 선택
    const finalUrl = page.url();
    const parserName = pickParserName(finalUrl);
    const parser =
      parserName === "smartstore" ? parseSmartStore :
      parserName === "aliexpress" ? parseAliExpress :
      parseGenericOG;

    let raw = await parser(page);

    // 사이트별 파서가 후보 0개를 줬으면 generic으로 한 번 더 시도
    if (parserName !== "generic" && raw.candidates.length === 0) {
      raw = await parseGenericOG(page);
    }

    // 이미지 후보 필터링 (placeholder/1px 제외) + 중복 제거
    const seen = new Set<string>();
    const validImages: string[] = [];
    for (const c of raw.candidates) {
      if (!isLikelyValidImage(c)) continue;
      if (seen.has(c)) continue;
      seen.add(c);
      validImages.push(c);
    }

    // 사이트 차단 페이지 감지 (title/description 패턴)
    const { blocked, reason } = detectBlocked(raw.title, raw.description);

    const result: UnfurlResult = {
      url: finalUrl,
      title: blocked ? "" : (raw.title || ""), // 차단 페이지의 "[에러]..." 같은 제목은 채우지 않음
      image: blocked ? "" : (validImages[0] || ""),
      imageCandidates: blocked ? [] : validImages,
      description: blocked ? "" : (raw.description || ""),
      price: blocked ? 0 : (raw.price || 0),
      siteName: raw.siteName || "",
      currency: raw.currency || "KRW",
      via: parserName,
      blocked,
      blockedReason: blocked ? reason : undefined,
    };

    // 차단된 경우는 캐시하지 않음 (재시도 가능하게)
    if (!blocked) {
      cache.set(cacheKey, { data: result, expiresAt: Date.now() + TTL_MS });
    }
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "페이지 분석 실패", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
}
