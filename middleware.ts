import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 커스텀 도메인 → slug 매핑 캐시 (5분 TTL)
const domainCache = new Map<string, { slug: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getSlugByDomain(hostname: string): Promise<string | null> {
  const cached = domainCache.get(hostname);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.slug;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/creator_shops?custom_domain=eq.${encodeURIComponent(hostname)}&select=creator_id,creators(shop_slug)`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const slug = data?.[0]?.creators?.shop_slug;
    if (slug) domainCache.set(hostname, { slug, ts: Date.now() });
    return slug || null;
  } catch {
    return null;
  }
}

// TubePing 기본 도메인 목록
const DEFAULT_DOMAINS = ["localhost", "tubeping.com", "tubeping.shop", "tpng.kr", "vercel.app"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // ── 커스텀 도메인 감지 ──
  const isDefaultDomain = DEFAULT_DOMAINS.some((d) => hostname.includes(d));
  if (!isDefaultDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const slug = await getSlugByDomain(hostname);
    if (slug) {
      // 커스텀 도메인 루트 → /shop/[slug] 로 rewrite
      if (pathname === "/" || pathname === "") {
        return NextResponse.rewrite(new URL(`/shop/${slug}`, request.url));
      }
      // 커스텀 도메인 하위 경로도 shop 컨텍스트로
      return NextResponse.rewrite(new URL(`/shop/${slug}${pathname}`, request.url));
    }
  }

  // ── 인증 체크 (기본 도메인) ──
  const protectedPaths = ["/dashboard"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Supabase 세션 확인
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비로그인 → 온보딩으로 리다이렉트
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // 대시보드 인증 체크
    "/dashboard/:path*",
    // 커스텀 도메인 루트 (정적 파일 제외)
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
