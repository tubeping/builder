import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그 — TubePing",
  description:
    "유튜브 쇼핑, 크리에이터 커머스, SNS 풀필먼트 관련 최신 가이드와 트렌드를 확인하세요.",
};

const CATEGORY_STYLE: Record<string, string> = {
  "서비스소개": "bg-blue-100 text-blue-700",
  "회사소개": "bg-purple-100 text-purple-700",
  "가이드": "bg-green-100 text-green-700",
  "전략": "bg-amber-100 text-amber-700",
  "트렌드": "bg-pink-100 text-pink-700",
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  keywords: string[];
  published_at: string;
  thumbnail_url: string | null;
};

export const revalidate = 60;

export default async function BlogListPage() {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("id, title, slug, excerpt, category, keywords, published_at, thumbnail_url")
    .eq("published", true)
    .order("published_at", { ascending: false });

  const blogPosts = (posts || []) as BlogPost[];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F0F0F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
          </Link>
          <Link
            href="/#contact"
            className="bg-[#C41E1E] text-white text-base font-semibold px-6 py-2.5 rounded-full hover:bg-[#A01818] transition-colors"
          >
            입점 신청
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-[#FFF8F8] to-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111]">블로그</h1>
          <p className="text-[#666666] text-lg mt-3">
            유튜브 쇼핑, 크리에이터 커머스의 모든 것
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          {blogPosts.length === 0 ? (
            <div className="text-center py-20 text-[#999999] text-lg">
              아직 게시된 글이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-[#F0F0F0] border-y border-[#F0F0F0]">
              {blogPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block py-6 sm:py-7 hover:bg-[#FAFAFA] transition-colors px-2 -mx-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_STYLE[post.category] || "bg-gray-100 text-gray-600"}`}
                      >
                        {post.category}
                      </span>
                      <span className="text-xs text-[#999999]">
                        {new Date(post.published_at).toLocaleDateString("ko", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#111111] mb-2 group-hover:text-[#C41E1E] transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm sm:text-base text-[#666666] line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-[#F9FAFB] py-16 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] mb-4">
          크리에이터 커머스, 지금 시작하세요
        </h2>
        <p className="text-[#666666] mb-8">초기 투자비 0원. 콘텐츠에만 집중하세요.</p>
        <Link
          href="/#contact"
          className="inline-block bg-[#C41E1E] text-white font-bold text-lg px-10 py-4 rounded-full hover:bg-[#A01818] transition-all"
        >
          입점 신청하기
        </Link>
      </section>
    </div>
  );
}
