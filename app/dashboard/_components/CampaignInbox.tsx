"use client";

import { useState } from "react";
import { Inbox as InboxIcon, Check, Target } from "lucide-react";

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

function formatCompactPrice(n: number) {
  if (n >= 10000) {
    const man = n / 10000;
    return man % 1 === 0 ? `${man}만원` : `${man.toFixed(1)}만원`;
  }
  return n.toLocaleString("ko-KR") + "원";
}

function matchTone(score: number) {
  if (score >= 90) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "탁월" };
  if (score >= 75) return { bar: "bg-amber-500", text: "text-amber-600", label: "양호" };
  return { bar: "bg-gray-400", text: "text-gray-500", label: "보통" };
}

function ddayTone(dday: number) {
  if (dday <= 1) return "bg-[#C41E1E] text-white";
  if (dday <= 3) return "bg-[#FFF0F0] text-[#C41E1E]";
  return "bg-gray-100 text-gray-600";
}

// ─── 메인 컴포넌트 ───
export default function CampaignInbox() {
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending = DUMMY_PROPOSALS.filter((p) => (statusMap[p.id] || "pending") === "pending");
  const approvedCount = Object.values(statusMap).filter((s) => s === "approved").length;
  const rejectedCount = Object.values(statusMap).filter((s) => s === "rejected").length;

  const handleApprove = (id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: "approved" }));
  };

  const handleReject = (id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: "rejected" }));
  };

  // 총 예상 수익 (대기 중)
  const totalExpected = pending.reduce(
    (acc, c) => acc + Math.round((c.targetGmv * c.commission) / 100),
    0
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      {/* ── 헤더 ── */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">공구 제안함</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            채널 팬층·판매 이력을 분석해 고른 공구입니다. 승인하면 자동으로 실행됩니다.
          </p>
        </div>

        {pending.length > 0 && (
          <div className="flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200">
            <span className="text-[11px] font-medium text-gray-500">대기 예상 수익</span>
            <span className="text-sm font-bold tabular-nums text-gray-900">
              {formatCompactPrice(totalExpected)}
            </span>
          </div>
        )}
      </div>

      {/* ── 요약 칩 ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F0] px-3 py-1.5 text-xs font-semibold text-[#C41E1E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C41E1E]" />
          대기 {pending.length}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          승인 {approvedCount}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          거절 {rejectedCount}
        </span>
      </div>

      {/* ── 제안 리스트 ── */}
      {pending.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white py-20 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <InboxIcon className="h-6 w-6 text-gray-300" strokeWidth={1.8} />
          </div>
          <p className="text-base font-bold text-gray-900">새 제안이 없습니다</p>
          <p className="mt-1.5 text-sm text-gray-500">다음 제안이 도착하면 카톡으로 알려드릴게요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((c) => {
            const isExpanded = expandedId === c.id;
            const expectedRevenue = Math.round((c.targetGmv * c.commission) / 100);
            const tone = matchTone(c.personaMatch);
            return (
              <article
                key={c.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md hover:ring-gray-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-[112px_1fr_220px] gap-5 p-5 md:p-6">
                  {/* 1열: 이미지 */}
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <span
                      className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${ddayTone(c.dday)}`}
                    >
                      D-{c.dday}
                    </span>
                  </div>

                  {/* 2열: 본문 */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                        {c.category}
                      </span>
                      <span className="text-gray-400">공급사 · {c.supplier}</span>
                    </div>

                    <h2 className="mt-2 text-[17px] font-bold leading-snug text-gray-900">
                      {c.productName}
                    </h2>

                    {/* 페르소나 매치 바 */}
                    <div className="mt-3 max-w-md">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-medium text-gray-500">페르소나 매치</span>
                        <span className={`font-bold tabular-nums ${tone.text}`}>
                          {c.personaMatch}% · {tone.label}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{ width: `${c.personaMatch}%` }}
                        />
                      </div>
                    </div>

                    {/* 가격 — 좌측 그룹 */}
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                      <div>
                        <p className="text-[11px] font-medium text-gray-400">공구가</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-700">
                          {formatPrice(c.suggestedPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-400">목표 GMV</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-700">
                          {formatCompactPrice(c.targetGmv)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-400">수수료</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-700">
                          {c.commission}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3열: 예상 수익 + 액션 (우측 패널) */}
                  <div className="flex flex-col gap-3 md:border-l md:border-gray-100 md:pl-5">
                    <div className="rounded-xl bg-[#FFF0F0] px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#C41E1E]">
                        예상 수익
                      </p>
                      <p className="mt-1 text-[26px] font-black tabular-nums leading-none text-[#C41E1E]">
                        {formatCompactPrice(expectedRevenue)}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-gray-500">
                        목표 달성 시
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(c.id)}
                        className="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => handleApprove(c.id)}
                        className="flex-[2] cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#A01818] active:translate-y-px"
                      >
                        승인하기
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="cursor-pointer text-[11px] font-medium text-gray-500 hover:text-gray-800 text-center"
                    >
                      {isExpanded ? "추천 이유 접기 ↑" : "추천 이유 보기 ↓"}
                    </button>
                  </div>
                </div>

                {/* 추천 이유 (펼침) — 카드 하단 풀폭 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 md:px-6">
                    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <Target className="h-3.5 w-3.5 text-[#C41E1E]" strokeWidth={2.4} />
                      TubePing이 이 상품을 고른 이유
                    </p>
                    <ul className="space-y-1.5">
                      {c.reasons.map((r, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-xs leading-relaxed text-gray-600"
                        >
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#C41E1E]" strokeWidth={2.6} />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
