"use client";

import { useState } from "react";

// ─── 타입 ───
type Platform = "all" | "youtube" | "instagram" | "tiktok";

interface ContentItem {
  id: string;
  platform: "youtube" | "instagram" | "tiktok";
  title: string;
  url: string;
  publishedAt: string;
  // 콘텐츠 지표
  views: number;
  likes: number;
  comments: number;
  // 매출 연결
  clicks: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  // 추적 방식
  attributionType: "utm" | "coupon" | "estimated";
  couponCode?: string;
  trackingUrl?: string;
  // 상품
  productName?: string;
}

// ─── 더미 데이터 ───
const DUMMY_SUMMARY = {
  totalContents: 18,
  trackedRevenue: 8472000,
  totalClicks: 2340,
  avgConversion: 3.2,
  topPlatform: "youtube" as const,
  revenueChange: 24.5,
};

const DUMMY_CONTENTS: ContentItem[] = [
  {
    id: "c1", platform: "youtube",
    title: "비타민C 3개월 먹어본 솔직 리뷰 (feat. 성분 비교)",
    url: "https://youtube.com/watch?v=abc123", publishedAt: "2026-04-08",
    views: 24500, likes: 1820, comments: 342,
    clicks: 687, orders: 47, revenue: 1840000, conversionRate: 6.8,
    attributionType: "utm", productName: "프리미엄 비타민C 5000mg",
    trackingUrl: "tubeping.shop/gwibinjeong?utm_source=youtube&utm_content=abc123",
  },
  {
    id: "c2", platform: "instagram",
    title: "요즘 매일 먹는 유산균 추천 (스토리 공구)",
    url: "https://instagram.com/p/xyz456", publishedAt: "2026-04-06",
    views: 8200, likes: 945, comments: 127,
    clicks: 423, orders: 31, revenue: 1209000, conversionRate: 7.3,
    attributionType: "utm", productName: "프로바이오틱스 유산균",
    trackingUrl: "tubeping.shop/gwibinjeong?utm_source=instagram&utm_content=xyz456",
  },
  {
    id: "c3", platform: "youtube",
    title: "에어프라이어 TOP 3 비교 테스트",
    url: "https://youtube.com/watch?v=def789", publishedAt: "2026-04-03",
    views: 31200, likes: 2340, comments: 456,
    clicks: 534, orders: 12, revenue: 1078800, conversionRate: 2.2,
    attributionType: "coupon", couponCode: "GWIBINJEONG-AF03",
    productName: "에어프라이어 5.5L 대용량",
  },
  {
    id: "c4", platform: "instagram",
    title: "선크림 바르는 올바른 순서 (릴스)",
    url: "https://instagram.com/reel/rlq001", publishedAt: "2026-04-10",
    views: 45300, likes: 3210, comments: 89,
    clicks: 312, orders: 28, revenue: 952000, conversionRate: 8.9,
    attributionType: "utm", productName: "선크림 SPF50",
  },
  {
    id: "c5", platform: "tiktok",
    title: "이 콜라겐 진짜 피부가 달라짐 #콜라겐추천",
    url: "https://tiktok.com/@gwibinjeong/video/001", publishedAt: "2026-04-09",
    views: 128000, likes: 8900, comments: 234,
    clicks: 189, orders: 15, revenue: 585000, conversionRate: 7.9,
    attributionType: "coupon", couponCode: "GWIBIN-TT09",
    productName: "콜라겐 펩타이드",
  },
  {
    id: "c6", platform: "youtube",
    title: "요즘 챙겨먹는 오메가3 (40대 필수)",
    url: "https://youtube.com/watch?v=omg001", publishedAt: "2026-03-28",
    views: 18700, likes: 1230, comments: 198,
    clicks: 195, orders: 8, revenue: 312000, conversionRate: 4.1,
    attributionType: "estimated", productName: "오메가3 rTG",
  },
];

// ─── 유틸 ───
function formatRevenue(n: number) {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "천만";
  if (n >= 10000) return (n / 10000).toFixed(0) + "만";
  return n.toLocaleString("ko-KR");
}
function formatNumber(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "만";
  return n.toLocaleString("ko-KR");
}
function platformIcon(p: "youtube" | "instagram" | "tiktok") {
  switch (p) {
    case "youtube": return "▶";
    case "instagram": return "◎";
    case "tiktok": return "♪";
  }
}
function platformColor(p: "youtube" | "instagram" | "tiktok") {
  switch (p) {
    case "youtube": return "bg-red-100 text-red-600";
    case "instagram": return "bg-purple-100 text-purple-600";
    case "tiktok": return "bg-gray-900 text-white";
  }
}
function attributionBadge(type: "utm" | "coupon" | "estimated") {
  switch (type) {
    case "utm": return { label: "UTM 추적", style: "bg-green-50 text-green-600" };
    case "coupon": return { label: "쿠폰 추적", style: "bg-blue-50 text-blue-600" };
    case "estimated": return { label: "추정", style: "bg-gray-100 text-gray-500" };
  }
}

// ─── 메인 컴포넌트 ───
export default function ContentAnalytics() {
  const [filter, setFilter] = useState<Platform>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "revenue" | "conversion">("revenue");

  const filtered = DUMMY_CONTENTS
    .filter(c => filter === "all" || c.platform === filter)
    .sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "conversion") return b.conversionRate - a.conversionRate;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  const summary = DUMMY_SUMMARY;

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">콘텐츠 분석</h2>
        <p className="mt-1 text-sm text-gray-500">
          어떤 콘텐츠가 얼마나 팔았는지 추적합니다
        </p>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">추적 콘텐츠</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary.totalContents}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">추적 매출</p>
          <div className="flex items-baseline gap-1.5">
            <p className="mt-1 text-2xl font-bold text-[#C41E1E]">{formatRevenue(summary.trackedRevenue)}원</p>
          </div>
          <p className="text-[10px] text-green-500 font-medium mt-0.5">+{summary.revenueChange}% vs 지난달</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">총 클릭</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatNumber(summary.totalClicks)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">평균 전환율</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary.avgConversion}%</p>
        </div>
      </div>

      {/* ── 링크 생성 가이드 ── */}
      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg">🔗</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">추적 링크를 사용하세요</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              영상 설명란이나 스토리에 아래 형식의 링크를 넣으면 자동으로 매출이 추적됩니다.
              쿠폰코드를 함께 사용하면 추적 정확도가 더 높아집니다.
            </p>
            <div className="mt-2 rounded-lg bg-white border border-blue-200 px-3 py-2">
              <code className="text-xs text-blue-800 break-all">
                tubeping.shop/gwibinjeong?utm_source=youtube&utm_content=영상ID
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* ── 필터 + 정렬 ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex gap-2">
          {([
            { key: "all" as const, label: "전체", count: DUMMY_CONTENTS.length },
            { key: "youtube" as const, label: "▶ YouTube", count: DUMMY_CONTENTS.filter(c => c.platform === "youtube").length },
            { key: "instagram" as const, label: "◎ Instagram", count: DUMMY_CONTENTS.filter(c => c.platform === "instagram").length },
            { key: "tiktok" as const, label: "♪ TikTok", count: DUMMY_CONTENTS.filter(c => c.platform === "tiktok").length },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {([
            { key: "revenue" as const, label: "매출순" },
            { key: "conversion" as const, label: "전환율순" },
            { key: "date" as const, label: "최신순" },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                sortBy === s.key ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 콘텐츠별 성과 리스트 ── */}
      <div className="space-y-3">
        {filtered.map((c, idx) => {
          const isExpanded = expandedId === c.id;
          const attr = attributionBadge(c.attributionType);
          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {/* 순위 + 플랫폼 */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${platformColor(c.platform)}`}>
                    {platformIcon(c.platform)}
                  </span>
                </div>

                {/* 본문 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${attr.style}`}>
                      {attr.label}
                    </span>
                    <span className="text-[11px] text-gray-400">{c.publishedAt}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{c.title}</h4>
                  {c.productName && (
                    <p className="mt-0.5 text-xs text-gray-400">상품: {c.productName}</p>
                  )}

                  {/* 핵심 지표 */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] text-gray-400">조회수</p>
                      <p className="text-sm font-bold text-gray-900">{formatNumber(c.views)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">클릭</p>
                      <p className="text-sm font-bold text-gray-900">{formatNumber(c.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">주문</p>
                      <p className="text-sm font-bold text-gray-900">{c.orders}건</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">매출</p>
                      <p className="text-sm font-bold text-[#C41E1E]">{formatRevenue(c.revenue)}원</p>
                    </div>
                  </div>

                  {/* 전환 퍼널 바 */}
                  <div className="mt-3 flex items-center gap-1">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-gray-400 rounded-full" style={{ width: "100%" }} />
                    </div>
                    <span className="text-[9px] text-gray-400 w-6 text-center">조회</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (c.clicks / c.views) * 100 * 10)}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-400 w-6 text-center">클릭</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-[#C41E1E] rounded-full" style={{ width: `${Math.min(100, c.conversionRate * 10)}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-400 w-10 text-center">{c.conversionRate}%</span>
                  </div>

                  {/* 상세 (펼침) */}
                  {isExpanded && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">추적 방식</span>
                        <span className="font-medium text-gray-900">{c.attributionType === "utm" ? "UTM 링크" : c.attributionType === "coupon" ? "쿠폰코드" : "시간 윈도우 추정"}</span>
                      </div>
                      {c.trackingUrl && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">추적 링크</span>
                          <span className="font-medium text-blue-600 truncate max-w-[200px]">{c.trackingUrl}</span>
                        </div>
                      )}
                      {c.couponCode && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">쿠폰코드</span>
                          <span className="font-mono font-bold text-gray-900">{c.couponCode}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">클릭률 (CTR)</span>
                        <span className="font-medium text-gray-900">{((c.clicks / c.views) * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">클릭당 매출</span>
                        <span className="font-medium text-gray-900">{formatRevenue(Math.round(c.revenue / c.clicks))}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">좋아요</span>
                        <span className="font-medium text-gray-900">{formatNumber(c.likes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">댓글</span>
                        <span className="font-medium text-gray-900">{formatNumber(c.comments)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 액션 */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="shrink-0 cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                >
                  {isExpanded ? "접기" : "상세"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 하단 팁 ── */}
      <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-2">추적 정확도 높이는 팁</p>
        <ul className="space-y-1.5 text-[11px] text-gray-500">
          <li className="flex gap-2"><span className="text-[#C41E1E]">1.</span> 영상 설명란에 UTM 링크를 꼭 넣으세요 (자동 생성 가능)</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">2.</span> 콘텐츠별 고유 쿠폰코드를 함께 안내하면 추적률이 90%+ 올라갑니다</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">3.</span> 인스타 스토리에는 스와이프업 링크 + UTM을 사용하세요</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">4.</span> 자동응답(AutoDM)과 함께 쓰면 풀퍼널 추적이 가능합니다</li>
        </ul>
      </div>
    </div>
  );
}
