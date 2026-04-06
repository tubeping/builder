"use client";

import { useState, useEffect, useCallback } from "react";

type BlogPost = {
  id: number;
  title: string;
  keyword: string;
  category: string;
  createdAt: string;
  publishedAt: string | null;
  naver: { published: boolean };
  tistory: { published: boolean };
  imageCount: number;
  charCount: number;
};

type Summary = {
  total: number;
  naverPublished: number;
  tistoryPublished: number;
  totalImages: number;
  totalChars: number;
  keywordStats: Record<string, number>;
};

const CATEGORY_STYLE: Record<string, string> = {
  "서비스소개": "bg-blue-100 text-blue-700",
  "회사소개": "bg-purple-100 text-purple-700",
  "가이드": "bg-green-100 text-green-700",
  "전략": "bg-amber-100 text-amber-700",
  "트렌드": "bg-pink-100 text-pink-700",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${mi}`;
}

function seoScore(post: BlogPost): number {
  let score = 0;
  // 글자수 (2000자 이상 = 30점)
  if (post.charCount >= 2000) score += 30;
  else if (post.charCount >= 1000) score += 20;
  else score += 10;
  // 이미지 (3개 이상 = 20점)
  if (post.imageCount >= 3) score += 20;
  else if (post.imageCount >= 1) score += 10;
  // 키워드 포함 = 15점
  if (post.title.includes(post.keyword)) score += 15;
  else score += 5;
  // 발행 완료 = 플랫폼당 10점
  if (post.naver.published) score += 10;
  if (post.tistory.published) score += 10;
  // 카테고리 분류 = 5점
  if (post.category) score += 5;
  // 제목 길이 (20~50자 = 10점)
  if (post.title.length >= 20 && post.title.length <= 50) score += 10;
  else if (post.title.length > 10) score += 5;
  return Math.min(score, 100);
}

function seoGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "A", color: "text-green-600 bg-green-50" };
  if (score >= 60) return { label: "B", color: "text-blue-600 bg-blue-50" };
  if (score >= 40) return { label: "C", color: "text-amber-600 bg-amber-50" };
  return { label: "D", color: "text-red-600 bg-red-50" };
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "pending">("all");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/blog");
      const data = await res.json();
      setPosts(data.posts || []);
      setSummary(data.summary || null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = posts.filter((p) => {
    if (filter === "published") return p.naver.published || p.tistory.published;
    if (filter === "pending") return !p.naver.published && !p.tistory.published;
    return true;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 발행 현황</h1>
          <p className="text-sm text-gray-500 mt-1">
            자동 발행 스케줄러 · 네이버 + 티스토리 · 30초마다 갱신
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            스케줄러 가동 중
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">총 콘텐츠</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">네이버 발행</p>
            <p className="text-2xl font-bold text-green-600">{summary.naverPublished}<span className="text-sm font-normal text-gray-400 ml-1">/ {summary.total}</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">티스토리 발행</p>
            <p className="text-2xl font-bold text-orange-500">{summary.tistoryPublished}<span className="text-sm font-normal text-gray-400 ml-1">/ {summary.total}</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">총 이미지</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalImages}<span className="text-sm font-normal text-gray-400 ml-1">장</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">총 글자수</p>
            <p className="text-2xl font-bold text-gray-900">{(summary.totalChars / 1000).toFixed(1)}<span className="text-sm font-normal text-gray-400 ml-1">천자</span></p>
          </div>
        </div>
      )}

      {/* Keyword Stats */}
      {summary?.keywordStats && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 mb-3">키워드별 발행</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.keywordStats).map(([kw, count]) => (
              <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                <span className="font-medium text-gray-900">{kw}</span>
                <span className="text-xs text-gray-500">{count}건</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: "all", label: "전체" },
          { key: "published", label: "발행 완료" },
          { key: "pending", label: "미발행" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              filter === f.key
                ? "bg-white text-[#C41E1E] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium w-8">#</th>
              <th className="text-left px-3 py-3 font-medium">제목</th>
              <th className="text-left px-3 py-3 font-medium">키워드</th>
              <th className="text-center px-3 py-3 font-medium">카테고리</th>
              <th className="text-center px-3 py-3 font-medium">네이버</th>
              <th className="text-center px-3 py-3 font-medium">티스토리</th>
              <th className="text-center px-3 py-3 font-medium">이미지</th>
              <th className="text-center px-3 py-3 font-medium">글자수</th>
              <th className="text-center px-3 py-3 font-medium">SEO</th>
              <th className="text-right px-5 py-3 font-medium">생성일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-sm text-gray-400">
                  발행된 콘텐츠가 없습니다
                </td>
              </tr>
            ) : (
              filtered.map((post) => {
                const score = seoScore(post);
                const grade = seoGrade(score);
                return (
                  <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-xs text-gray-400">{post.id}</td>
                    <td className="px-3 py-3.5">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[280px]">{post.title}</p>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-gray-600">{post.keyword}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLE[post.category] || "bg-gray-100 text-gray-600"}`}>
                        {post.category}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {post.naver.published ? (
                        <span className="text-green-600 text-sm font-medium">발행</span>
                      ) : (
                        <span className="text-gray-300 text-sm">미발행</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {post.tistory.published ? (
                        <span className="text-green-600 text-sm font-medium">발행</span>
                      ) : (
                        <span className="text-gray-300 text-sm">미발행</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center text-sm text-gray-500">{post.imageCount}장</td>
                    <td className="px-3 py-3.5 text-center text-sm text-gray-500">{post.charCount.toLocaleString()}</td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${grade.color}`}>
                          {grade.label}
                        </span>
                        <span className="text-xs text-gray-400">{score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 text-right">{formatDate(post.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
