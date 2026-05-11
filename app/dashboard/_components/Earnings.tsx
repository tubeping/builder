"use client";

/**
 * 수익 페이지 — 페르소나 Round 3
 *
 * 페르소나 니즈:
 *   - "조회 조건을 내가 선택" → 기간·소스·캠페인 필터
 *   - "총매출 vs 정산금" → 두 지표 분리 표시
 *   - "상품별 마진·수익률" → 마진 매트릭스
 *   - "전월 대비 변화" → 비교 모드
 *
 * 데이터 출처:
 *   - 카페24 공구: campaigns 테이블 (admin 공유 DB)
 *   - 쿠팡: Report API (Phase B에서 연동)
 *   - 네이버: 수동 입력
 *   - 직접 판매: 수동 또는 외부 결제 연동
 */

import { useState, useMemo } from "react";
import { CalendarRange, Filter, TrendingUp, TrendingDown } from "lucide-react";

// ─── 타입 ───
type Source = "campaign" | "coupang" | "naver" | "own" | "other";
type Period = "this_month" | "last_month" | "last_3m" | "this_year" | "custom";
type SettlementStatus = "paid" | "pending" | "preview";

interface SettlementRow {
  id: string;
  period: string;          // YYYY-MM
  campaign: string;
  source: Source;
  gmv: number;             // 매출
  supplyCost: number;      // 공급가
  netMargin: number;       // 순마진 (인플 + 튜핑 합)
  takeHome: number;        // 인플루언서 몫
  status: SettlementStatus;
  paidDate: string | null;
}

interface ProductMargin {
  id: string;
  name: string;
  source: Source;
  unitsSold: number;
  price: number;
  supplyCost: number;
  marginRate: number;   // %
  takeHome: number;     // 총 인플 몫
}

// ─── 더미 데이터 (Supabase 연동 시 자동 교체) ───
const SETTLEMENTS: SettlementRow[] = [
  { id: "s1", period: "2026-03", campaign: "비타민C 5000mg 공구", source: "campaign", gmv: 9200000, supplyCost: 5520000, netMargin: 3060000, takeHome: 1836000, status: "paid", paidDate: "2026-04-05" },
  { id: "s2", period: "2026-03", campaign: "유기농 프로틴 공구", source: "campaign", gmv: 4473500, supplyCost: 2530000, netMargin: 1490000, takeHome: 894000, status: "paid", paidDate: "2026-04-05" },
  { id: "s3", period: "2026-04", campaign: "에어프라이어 공구", source: "campaign", gmv: 2100000, supplyCost: 1050000, netMargin: 920000, takeHome: 552000, status: "pending", paidDate: null },
  { id: "s4", period: "2026-04", campaign: "쿠팡 파트너스 (4월)", source: "coupang", gmv: 600000, supplyCost: 0, netMargin: 180000, takeHome: 180000, status: "preview", paidDate: null },
  { id: "s5", period: "2026-04", campaign: "네이버 쇼핑커넥트 (4월)", source: "naver", gmv: 47000, supplyCost: 0, netMargin: 14000, takeHome: 14000, status: "preview", paidDate: null },
];

const TOP_PRODUCTS: ProductMargin[] = [
  { id: "p1", name: "비타민C 5000mg 90정", source: "campaign", unitsSold: 308, price: 29900, supplyCost: 18000, marginRate: 39.8, takeHome: 1836000 },
  { id: "p2", name: "유기농 프로틴 1kg", source: "campaign", unitsSold: 115, price: 38900, supplyCost: 22000, marginRate: 43.4, takeHome: 894000 },
  { id: "p3", name: "에어프라이어 5.5L", source: "campaign", unitsSold: 24, price: 89000, supplyCost: 53000, marginRate: 40.4, takeHome: 552000 },
];

// ─── 유틸 ───
function fmtPrice(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function fmtCompact(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + "만";
  return n.toLocaleString("ko-KR");
}

const SOURCE_META: Record<Source, { label: string; color: string; bg: string }> = {
  campaign: { label: "공구", color: "#C41E1E", bg: "#FFF0F0" },
  coupang:  { label: "쿠팡", color: "#F6502E", bg: "#FFF3F0" },
  naver:    { label: "네이버", color: "#03C75A", bg: "#F0FDF4" },
  own:      { label: "직접", color: "#8B5CF6", bg: "#F5F3FF" },
  other:    { label: "기타", color: "#6B7280", bg: "#F9FAFB" },
};

const STATUS_META: Record<SettlementStatus, { label: string; bg: string; color: string }> = {
  paid:    { label: "정산 완료", bg: "bg-green-100", color: "text-green-700" },
  pending: { label: "정산 대기", bg: "bg-amber-100", color: "text-amber-700" },
  preview: { label: "추정값",    bg: "bg-blue-100",  color: "text-blue-700" },
};

const PERIODS: { value: Period; label: string }[] = [
  { value: "this_month", label: "이번 달" },
  { value: "last_month", label: "지난 달" },
  { value: "last_3m", label: "최근 3개월" },
  { value: "this_year", label: "올해" },
  { value: "custom", label: "사용자 지정" },
];

// ─── 메인 ───
export default function Earnings() {
  const [period, setPeriod] = useState<Period>("this_month");
  const [sourceFilter, setSourceFilter] = useState<Source | "all">("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // 필터링
  const filtered = useMemo(() => {
    let rows = SETTLEMENTS;
    if (sourceFilter !== "all") rows = rows.filter((r) => r.source === sourceFilter);
    // 기간 필터는 더미라 간단 처리
    if (period === "this_month") rows = rows.filter((r) => r.period === "2026-04");
    if (period === "last_month") rows = rows.filter((r) => r.period === "2026-03");
    return rows;
  }, [sourceFilter, period]);

  // 집계
  const totals = useMemo(() => {
    const gmv = filtered.reduce((s, r) => s + r.gmv, 0);
    const netMargin = filtered.reduce((s, r) => s + r.netMargin, 0);
    const takeHome = filtered.reduce((s, r) => s + r.takeHome, 0);
    const paid = filtered.filter((r) => r.status === "paid").reduce((s, r) => s + r.takeHome, 0);
    const pending = filtered.filter((r) => r.status === "pending" || r.status === "preview").reduce((s, r) => s + r.takeHome, 0);
    return { gmv, netMargin, takeHome, paid, pending };
  }, [filtered]);

  // 전기 대비 (mock: this_month vs last_month)
  const prev = useMemo(() => {
    const rows = SETTLEMENTS.filter((r) => r.period === "2026-03");
    return {
      gmv: rows.reduce((s, r) => s + r.gmv, 0),
      takeHome: rows.reduce((s, r) => s + r.takeHome, 0),
    };
  }, []);

  const deltaGmv = prev.gmv > 0 ? Math.round(((totals.gmv - prev.gmv) / prev.gmv) * 1000) / 10 : null;
  const deltaTake = prev.takeHome > 0 ? Math.round(((totals.takeHome - prev.takeHome) / prev.takeHome) * 1000) / 10 : null;

  return (
    <div className="p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">수익</h2>
        <p className="mt-1 text-sm text-gray-500">매출(GMV) · 영업이익 · 정산 현황을 한눈에</p>
      </div>

      {/* 필터 바 */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 기간 */}
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-gray-400" />
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {PERIODS.map((p) => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    period === p.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 소스 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as Source | "all")}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium outline-none focus:border-[#C41E1E]">
              <option value="all">모든 소스</option>
              {Object.entries(SOURCE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* 사용자 지정 */}
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-[#C41E1E]" />
              <span className="text-[10px] text-gray-400">~</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-[#C41E1E]" />
            </div>
          )}
        </div>
      </div>

      {/* KPI 4타일 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiTile
          label="매출 GMV"
          value={fmtPrice(totals.gmv)}
          subtext="총 거래액 (세금 공제 전)"
          delta={deltaGmv}
          icon="💳"
        />
        <KpiTile
          label="영업이익 (예상)"
          value={fmtPrice(totals.takeHome)}
          subtext="크리에이터 몫 (인플 60%)"
          delta={deltaTake}
          icon="💰"
          highlight
        />
        <KpiTile
          label="정산 완료"
          value={fmtPrice(totals.paid)}
          subtext="이미 입금된 금액"
          icon="✅"
          tone="green"
        />
        <KpiTile
          label="정산 대기 / 추정"
          value={fmtPrice(totals.pending)}
          subtext="입금 예정 + 외부 플랫폼 추정"
          icon="⏳"
          tone="amber"
        />
      </div>

      {/* 매출 vs 정산 안내 */}
      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-[11px] text-blue-900 leading-relaxed">
        💡 <b>매출(GMV)과 정산금은 시점이 다릅니다.</b> 매출은 주문 발생 즉시 집계되고, 정산금은
        <b> 매월 5일</b>에 전월 분이 입금됩니다. 카페24 공구는 자동 정산이고, 쿠팡·네이버는 각 플랫폼에서
        본인 계좌로 직접 입금합니다.
      </div>

      {/* 소스별 분포 */}
      <SourceBreakdown rows={filtered} totalGmv={totals.gmv} />

      {/* 상품별 마진 — 페르소나: "어떤 상품이 얼마 남는지" */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">상품별 마진 분석</h3>
            <p className="mt-0.5 text-[10px] text-gray-400">고마진(소량) vs 저마진(대량) 어느 쪽이 잘 되는지 보세요</p>
          </div>
          <span className="text-[10px] text-gray-400">{TOP_PRODUCTS.length}개</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-3 font-bold">상품</th>
                <th className="text-right p-3 font-bold">판매가</th>
                <th className="text-right p-3 font-bold">공급가</th>
                <th className="text-center p-3 font-bold">마진율</th>
                <th className="text-right p-3 font-bold">판매 수량</th>
                <th className="text-right p-3 font-bold">내 수익</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TOP_PRODUCTS.map((p) => {
                const srcMeta = SOURCE_META[p.source];
                const marginTone =
                  p.marginRate >= 40 ? "text-emerald-600 bg-emerald-50" :
                  p.marginRate >= 25 ? "text-amber-600 bg-amber-50" :
                  "text-gray-600 bg-gray-50";
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: srcMeta.bg, color: srcMeta.color }}>{srcMeta.label}</span>
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-700">{fmtPrice(p.price)}</td>
                    <td className="p-3 text-right text-gray-500">{fmtPrice(p.supplyCost)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${marginTone}`}>
                        {p.marginRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-700">{p.unitsSold.toLocaleString()}개</td>
                    <td className="p-3 text-right font-bold text-[#C41E1E]">{fmtCompact(p.takeHome)}원</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-gray-400">
          💡 <b>마진율 40%↑</b> 상품은 소량 판매로도 수익이 좋고, <b>마진율 25~40%</b>는 대량 판매로 가야 의미 있어요.
        </p>
      </div>

      {/* 정산 내역 */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-gray-900">정산 내역</h3>
          <span className="text-[10px] text-gray-400">{filtered.length}건</span>
        </div>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">조건에 해당하는 정산이 없어요</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left p-3 font-bold">기간</th>
                  <th className="text-left p-3 font-bold">캠페인</th>
                  <th className="text-right p-3 font-bold">GMV</th>
                  <th className="text-right p-3 font-bold">내 수익</th>
                  <th className="text-center p-3 font-bold">상태</th>
                  <th className="text-left p-3 font-bold">입금일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const srcMeta = SOURCE_META[r.source];
                  const stMeta = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-600">{r.period}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: srcMeta.bg, color: srcMeta.color }}>{srcMeta.label}</span>
                          <span className="text-gray-900">{r.campaign}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-gray-700">{fmtPrice(r.gmv)}</td>
                      <td className="p-3 text-right font-bold text-[#C41E1E]">{fmtPrice(r.takeHome)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${stMeta.bg} ${stMeta.color}`}>
                          {stMeta.label}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{r.paidDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] text-gray-400">
          정산 완료 시 세금계산서가 이메일로 자동 발송됩니다 · 입금일: <b>매월 5일</b>
        </p>
      </div>
    </div>
  );
}

// ─── 작은 컴포넌트들 ───

function KpiTile({ icon, label, value, subtext, delta, highlight, tone }: {
  icon: string;
  label: string;
  value: string;
  subtext: string;
  delta?: number | null;
  highlight?: boolean;
  tone?: "green" | "amber";
}) {
  const deltaUp = (delta ?? 0) >= 0;
  const cardClass = highlight
    ? "bg-gradient-to-br from-[#C41E1E] to-[#A01818] text-white"
    : tone === "green"
    ? "bg-white border border-green-100"
    : tone === "amber"
    ? "bg-white border border-amber-100"
    : "bg-white border border-gray-200";
  return (
    <div className={`rounded-xl p-4 ${cardClass}`}>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${highlight ? "text-white/80" : "text-gray-400"}`}>
        <span>{icon}</span><span>{label}</span>
      </div>
      <p className={`mt-1.5 text-xl font-extrabold leading-tight ${highlight ? "text-white" : "text-gray-900"}`}>{value}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
            highlight ? "text-white" : deltaUp ? "text-green-600" : "text-red-500"
          }`}>
            {deltaUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        <p className={`text-[10px] ${highlight ? "text-white/70" : "text-gray-500"}`}>{subtext}</p>
      </div>
    </div>
  );
}

function SourceBreakdown({ rows, totalGmv }: { rows: SettlementRow[]; totalGmv: number }) {
  const bySource = useMemo(() => {
    const map = new Map<Source, { gmv: number; takeHome: number }>();
    for (const r of rows) {
      const cur = map.get(r.source) || { gmv: 0, takeHome: 0 };
      map.set(r.source, { gmv: cur.gmv + r.gmv, takeHome: cur.takeHome + r.takeHome });
    }
    return Array.from(map.entries())
      .map(([source, v]) => ({ source, ...v, pct: totalGmv > 0 ? (v.gmv / totalGmv) * 100 : 0 }))
      .sort((a, b) => b.gmv - a.gmv);
  }, [rows, totalGmv]);

  if (bySource.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-gray-900">소스별 매출 분포</h3>
        <span className="text-[10px] text-gray-400">총 {fmtPrice(totalGmv)}</span>
      </div>
      <div className="space-y-2.5">
        {bySource.map((s) => {
          const meta = SOURCE_META[s.source];
          return (
            <div key={s.source}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  <span className="text-[11px] text-gray-700">{fmtPrice(s.gmv)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-gray-400">내 수익 {fmtCompact(s.takeHome)}원</span>
                  <span className="text-[11px] font-bold text-gray-900 w-12 text-right">{s.pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: meta.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
