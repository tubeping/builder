"use client";

import { useState } from "react";

// ─── 더미 데이터 ───
const DUMMY_PROPOSALS: Campaign[] = [
  {
    id: "c1",
    productName: "프리미엄 비타민C 5000mg 90정",
    category: "건강식품",
    supplyPrice: 18000,
    suggestedPrice: 29900,
    targetGmv: 3000000,
    commission: 20,
    personaMatch: 92,
    supplier: "신산웰니스",
    image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/c01e2014421c64300ca8a4c31d0d6ec9.jpg",
    proposedAt: "2026-04-04",
    dday: 3,
    reasons: ["구독자 30~40대 건강관심 높음", "지난 3개 공구 건강식품 평균 150% 달성"],
  },
  {
    id: "c2",
    productName: "유기농 프로틴 파우더 1kg",
    category: "건강식품",
    supplyPrice: 22000,
    suggestedPrice: 38900,
    targetGmv: 2000000,
    commission: 20,
    personaMatch: 85,
    supplier: "그린프로틴",
    image: null,
    proposedAt: "2026-04-03",
    dday: 2,
    reasons: ["지난 프로틴 공구 183% 달성", "남성 구독자 비중 높음"],
  },
  {
    id: "c3",
    productName: "스테인리스 진공 텀블러 500ml",
    category: "생활",
    supplyPrice: 9000,
    suggestedPrice: 18900,
    targetGmv: 1500000,
    commission: 20,
    personaMatch: 68,
    supplier: "리빙굿즈",
    image: null,
    proposedAt: "2026-04-02",
    dday: 1,
    reasons: ["일상템 공구 전환율 양호"],
  },
];

// ─── 타입 ───
interface Campaign {
  id: string;
  productName: string;
  category: string;
  supplyPrice: number;
  suggestedPrice: number;
  targetGmv: number;
  commission: number;
  personaMatch: number;
  supplier: string;
  image: string | null;
  proposedAt: string;
  dday: number;
  reasons: string[];
}

type Status = "pending" | "approved" | "rejected";

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function matchColor(score: number) {
  if (score >= 90) return "bg-green-100 text-green-700";
  if (score >= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

// ─── 메인 컴포넌트 ───
export default function CampaignInbox() {
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending = DUMMY_PROPOSALS.filter((p) => (statusMap[p.id] || "pending") === "pending");

  const handleApprove = (id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: "approved" }));
  };

  const handleReject = (id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: "rejected" }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">공구 제안함</h2>
        <p className="mt-1 text-sm text-gray-500">
          TubePing이 채널에 맞춰 선별한 공구 상품입니다. 승인하면 바로 실행됩니다.
        </p>
      </div>

      {/* 요약 */}
      <div className="mb-5 flex gap-3">
        <div className="flex-1 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">대기 중</p>
          <p className="mt-1 text-2xl font-bold text-[#C41E1E]">{pending.length}</p>
        </div>
        <div className="flex-1 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">승인</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {Object.values(statusMap).filter((s) => s === "approved").length}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">거절</p>
          <p className="mt-1 text-2xl font-bold text-gray-400">
            {Object.values(statusMap).filter((s) => s === "rejected").length}
          </p>
        </div>
      </div>

      {/* 제안 리스트 */}
      {pending.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-medium text-gray-900">새 제안이 없습니다</p>
          <p className="mt-1 text-xs text-gray-500">다음 제안이 도착하면 카톡으로 알려드릴게요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((c) => {
            const isExpanded = expandedId === c.id;
            const expectedRevenue = Math.round(c.targetGmv * c.commission / 100);
            return (
              <div key={c.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex gap-4">
                  {/* 이미지 */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {c.image ? (
                      <img src={c.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* 본문 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            {c.category}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${matchColor(c.personaMatch)}`}>
                            페르소나 매치 {c.personaMatch}%
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-gray-900 leading-snug">
                          {c.productName}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">공급사: {c.supplier}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#fff0f0] px-2 py-0.5 text-[10px] font-medium text-[#C41E1E]">
                        D-{c.dday}
                      </span>
                    </div>

                    {/* 수치 */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">공구가</p>
                        <p className="mt-0.5 font-semibold text-gray-900">{formatPrice(c.suggestedPrice)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">목표 GMV</p>
                        <p className="mt-0.5 font-semibold text-gray-900">{formatPrice(c.targetGmv)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">예상 수익</p>
                        <p className="mt-0.5 font-semibold text-[#C41E1E]">{formatPrice(expectedRevenue)}</p>
                      </div>
                    </div>

                    {/* 추천 이유 (펼침) */}
                    {isExpanded && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-700 mb-1.5">TubePing 추천 이유</p>
                        <ul className="space-y-1">
                          {c.reasons.map((r, i) => (
                            <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                              <span className="text-[#C41E1E]">·</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 액션 */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="cursor-pointer text-xs text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? "접기" : "자세히 ↓"}
                      </button>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleReject(c.id)}
                          className="cursor-pointer rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          거절
                        </button>
                        <button
                          onClick={() => handleApprove(c.id)}
                          className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]"
                        >
                          승인하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
