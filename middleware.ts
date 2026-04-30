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

// TubePing builder가 서빙하는 도메인 목록 (커스텀 도메인 라우팅 제외용)
const DEFAULT_DOMAINS = ["localhost", "tubeping.com", "tubeping.shop", "tpng.kr", "vercel.app"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // ── 커스텀 도메인 감지 ──
  const isDefaultDomain = DEFAULT_DOMAINS.some((d) => hostname.includes(d));
  if (!isDefaultDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const slug = await getSlugByDomain(hostname);
    if (slug) {
      if (pathname === "/" || pathname === "") {
        return NextResponse.rewrite(new URL(`/shop/${slug}`, request.url));
      }
      return NextResponse.rewrite(new URL(`/shop/${slug}${pathname}`, request.url));
    }
  }

  // ── 인증 가드 ──
  const protectedPaths = ["/dashboard", "/onboarding", "/settings"];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Supabase 세션 검증 — createServerClient (SSR 쿠키 형식 정확히 파싱)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
