"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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
};

export default function BlogListClient({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => set.add(p.category));
    return ["전체", ...Array.from(set)];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedCategory !== "전체" && post.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [posts, query, selectedCategory]);

  return (
    <>
      {/* 검색 + 카테고리 필터 */}
      <div className="max-w-3xl mx-auto mb-8 space-y-4">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목, 내용, 키워드로 검색..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-[#E0E0E0] text-base text-[#111111] placeholder:text-[#999999] focus:border-[#C41E1E] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-[#C41E1E] text-white"
                  : "bg-[#F3F4F6] text-[#666666] hover:bg-[#E5E7EB]"
              }`}
            >
              {cat}
              {cat !== "전체" && (
                <span className="ml-1 text-xs opacity-70">
                  ({posts.filter((p) => p.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="text-sm text-[#999999]">
          {filtered.length === posts.length
            ? `총 ${posts.length}개의 글`
            : `${filtered.length}개의 검색 결과 (전체 ${posts.length}개 중)`}
        </div>
      </div>

      {/* 글 목록 */}
      <div className="max-w-3xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#999999] text-lg">
            검색 결과가 없습니다. 다른 키워드로 시도해보세요.
          </div>
        ) : (
          <ul className="divide-y divide-[#F0F0F0] border-y border-[#F0F0F0]">
            {filtered.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block py-6 sm:py-7 hover:bg-[#FAFAFA] transition-colors px-2 -mx-2 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        CATEGORY_STYLE[post.category] || "bg-gray-100 text-gray-600"
                      }`}
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
    </>
  );
}
