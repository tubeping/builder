"use client";

import { useState } from "react";

// ─── 더미 데이터 ───
const MONTHLY_TOTAL = {
  gross: 4638700,
  byCampaign: 1840000,
  byCoupang: 180000,
  byNaver: 14000,
  byOwn: 1680000,
  byOther: 924700,
};

const SETTLEMENTS = [
  { id: "s1", period: "2026-03", campaign: "비타민C 5000mg 공구", gmv: 9200000, net: 1840000, status: "paid" as const, paidDate: "2026-04-05" },
  { id: "s2", period: "2026-03", campaign: "유기농 프로틴 공구", gmv: 4473500, net: 894700, status: "paid" as const, paidDate: "2026-04-05" },
  { id: "s3", period: "2026-04", campaign: "에어프라이어 공구", gmv: 2100000, net: 420000, status: "pending" as const, paidDate: null },
];

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function statusStyle(s: "paid" | "pending") {
  return s === "paid"
    ? "bg-green-100 text-green-700"
    : "bg-yellow-100 text-yellow-700";
}

function statusLabel(s: "paid" | "pending") {
  return s === "paid" ? "정산 완료" : "정산 대기";
}

// ─── 메인 컴포넌트 ───
export default function Earnings() {
  const [period, setPeriod] = useState<"month" | "all">("month");

  const sources = [
    { label: "공구", value: MONTHLY_TOTAL.byCampaign, color: "bg-[#C41E1E]" },
    { label: "직접판매", value: MONTHLY_TOTAL.byOwn, color: "bg-[#111111]" },
    { label: "기타 제휴", value: MONTHLY_TOTAL.byOther, color: "bg-purple-500" },
    { label: "쿠팡", value: MONTHLY_TOTAL.byCoupang, color: "bg-[#e44232]" },
    { label: "네이버", value: MONTHLY_TOTAL.byNaver, color: "bg-[#03C75A]" },
  ];

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">수익</h2>
          <p className="mt-1 text-sm text-gray-500">모든 소스의 수익과 정산 현황</p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setPeriod("month")}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${
              period === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            이번 달
          </button>
          <button
            onClick={() => setPeriod("all")}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${
              period === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {/* 총 수익 */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#C41E1E] to-[#111111] p-6 text-white">
        <p className="text-xs opacity-80">{period === "month" ? "이번 달 총 수익" : "누적 총 수익"}</p>
        <p className="mt-1 text-3xl font-bold">{formatPrice(MONTHLY_TOTAL.gross)}</p>
        <p className="mt-2 text-xs opacity-80">세금 공제 전 · 정산일 매월 5일</p>
      </div>

      {/* 소스별 수익 */}
      <div className="mb-6 rounded-xl border border-gray-200 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">소스별 수익</h3>
        <div className="space-y-3">
          {sources.map((s) => {
            const pct = (s.value / MONTHLY_TOTAL.gross) * 100;
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{s.label}</span>
                  <span className="text-xs text-gray-500">
                    {formatPrice(s.value)} · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 정산 내역 */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">정산 내역</h3>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">기간</th>
                <th className="px-4 py-3 font-medium">캠페인</th>
                <th className="px-4 py-3 font-medium text-right">GMV</th>
                <th className="px-4 py-3 font-medium text-right">정산액</th>
                <th className="px-4 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SETTLEMENTS.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.period}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{s.campaign}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">{formatPrice(s.gmv)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-[#C41E1E]">{formatPrice(s.net)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusStyle(s.status)}`}>
                      {statusLabel(s.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          정산 완료 시 세금계산서가 이메일로 자동 발송됩니다
        </p>
      </div>
    </div>
  );
}
