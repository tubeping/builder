"use client";

/**
 * 통계 대시보드 — 핵심 5지표 풀스택
 * ① 유입 ② 클릭 ③ 매출(GMV) ④ 영업이익(Take-home) ⑤ 시청자 반응
 *
 * 자동 수집(라이브) vs 외부 연동 대기를 데이터 출처 라벨로 명확히 구분.
 */

import React, { useEffect, useState, useMemo } from "react";

// ─── 타입 ───
interface StatsTotals {
  clicks: number;
  unique_visitors: number;
  unique_picks: number;
  days: number;
  gmv: number;
  take_home: number;
  orders: number;
  avg_order: number;
  conversion_rate: number | null;
  delta: { clicks: number | null; visitors: number | null };
}
interface StatsResponse {
  totals: StatsTotals;
  funnel: { reach: number; clicks: number; orders: number; completed: number; rates: { visit_to_click: number; click_to_order: number | null } };
  daily: { date: string; clicks: number; visitors: number; gmv: number; orders: number }[];
  by_source: { source: string; clicks: number; pct: number; gmv: number }[];
  by_device: { device: string; clicks: number }[];
  top_picks: { pick_id: string; name: string; image: string | null; clicks: number; revenue: number }[];
  by_campaign: { campaign: string; clicks: number; gmv: number }[];
  active_campaigns: { id: string; product_name: string; image: string | null; target_gmv: number; actual_gmv: number; achievement_rate: number; d_day: number }[];
  content: { available: boolean; sources: string[]; totals: { views: number; likes: number; comments: number; saves: number; shares: number }; daily: { date: string; views: number; likes: number; comments: number }[]; top_content: { id: string; title: string; thumbnail: string | null; platform: string; views: number; likes: number; comments: number; revenue: number }[]; message: string };
  insights: { type: "positive" | "warning" | "info"; title: string; detail: string }[];
  data_sources: Record<string, { status: "live" | "partial" | "estimated" | "pending"; label: string }>;
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  instagram: { label: "인스타", color: "#E1306C" },
  youtube: { label: "유튜브", color: "#FF0000" },
  kakao: { label: "카톡", color: "#FAE100" },
  naver: { label: "네이버", color: "#03C75A" },
  tiktok: { label: "틱톡", color: "#010101" },
  threads: { label: "스레드", color: "#000000" },
  tubeping: { label: "튜핑", color: "#C41E1E" },
  direct: { label: "다이렉트", color: "#6B7280" },
  link: { label: "SNS링크", color: "#3B82F6" },
  banner: { label: "배너", color: "#F59E0B" },
  campaign_live: { label: "공구LIVE", color: "#10B981" },
  tubeping_campaign: { label: "공구", color: "#C41E1E" },
  coupang: { label: "쿠팡", color: "#F6502E" },
  own: { label: "직접", color: "#8B5CF6" },
};

function fmt(n: number) { return n.toLocaleString("ko-KR"); }
function fmtPrice(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function shortNum(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "만";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ─── 작은 컴포넌트들 ───

function StatusBadge({ status, label }: { status: "live" | "partial" | "estimated" | "pending"; label: string }) {
  const map = {
    live: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", icon: "●" },
    partial: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", icon: "◐" },
    estimated: { dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50", icon: "≈" },
    pending: { dot: "bg-gray-400", text: "text-gray-500", bg: "bg-gray-50", icon: "○" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${m.bg} px-2 py-0.5 text-[9px] font-bold ${m.text}`}>
      <span>{m.icon}</span>{label}
    </span>
  );
}

function KpiTile({ icon, label, value, subtext, delta, status, statusLabel }: {
  icon: string; label: string; value: string | number;
  subtext?: string; delta?: number | null;
  status?: "live" | "partial" | "estimated" | "pending"; statusLabel?: string;
}) {
  const deltaUp = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
          <span>{icon}</span><span>{label}</span>
        </div>
        {status && statusLabel && <StatusBadge status={status} label={statusLabel} />}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${deltaUp ? "text-green-600" : "text-red-500"}`}>
            {deltaUp ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {subtext && <p className="text-[10px] text-gray-500">{subtext}</p>}
      </div>
    </div>
  );
}

function FunnelWidget({ funnel, content }: { funnel: StatsResponse["funnel"]; content: StatsResponse["content"] }) {
  const reach = funnel.reach;
  const max = Math.max(content.totals.views || 0, reach, funnel.clicks, 1);
  const stages = [
    { label: "노출(조회)", value: content.totals.views || 0, locked: !content.available, color: "#9CA3AF", note: content.available ? "" : "콘텐츠 연동 시" },
    { label: "방문(UV)", value: reach, locked: false, color: "#3B82F6", note: "" },
    { label: "클릭", value: funnel.clicks, locked: false, color: "#EAB308", note: funnel.rates.visit_to_click ? `${funnel.rates.visit_to_click}% CTR` : "" },
    { label: "주문", value: funnel.orders, locked: funnel.orders === 0, color: "#10B981", note: funnel.orders === 0 ? "외부 연동 시" : "" },
    { label: "구매확정", value: funnel.completed, locked: funnel.completed === 0, color: "#C41E1E", note: funnel.completed === 0 ? "외부 연동 시" : "" },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">전환 퍼널</h3>
        <span className="text-[10px] text-gray-400">최근 {funnel.reach > 0 ? "기간" : ""}</span>
      </div>
      <div className="space-y-2">
        {stages.map((s, i) => {
          const w = max > 0 ? Math.max(8, (s.value / max) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] font-medium text-gray-700">{s.label}</span>
              <div className="flex-1 h-6 rounded bg-gray-50 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded transition-all"
                  style={{ width: `${w}%`, background: s.locked ? "repeating-linear-gradient(45deg, #E5E7EB, #E5E7EB 4px, #F3F4F6 4px, #F3F4F6 8px)" : s.color, opacity: s.locked ? 0.6 : 1 }} />
                <div className="relative flex items-center h-full px-2 gap-2">
                  <span className={`text-[11px] font-bold ${s.locked ? "text-gray-400" : "text-white drop-shadow-sm"}`}>
                    {s.locked ? "🔒" : fmt(s.value)}
                  </span>
                  {s.note && <span className={`text-[9px] ${s.locked ? "text-gray-400" : "text-white/90"}`}>· {s.note}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyChart({ daily }: { daily: StatsResponse["daily"] }) {
  const maxClicks = Math.max(1, ...daily.map(d => d.clicks));
  const maxGmv = Math.max(1, ...daily.map(d => d.gmv));
  const hasGmv = daily.some(d => d.gmv > 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">일별 추이</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#C41E1E]" />클릭</span>
          {hasGmv && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500" />매출</span>}
        </div>
      </div>
      <div className="flex items-end gap-0.5 h-32">
        {daily.map((d, i) => {
          const hC = d.clicks > 0 ? Math.max(2, (d.clicks / maxClicks) * 100) : 0;
          const hG = d.gmv > 0 ? Math.max(2, (d.gmv / maxGmv) * 100) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col-reverse gap-px group cursor-default">
              <div className="w-full rounded-t-sm bg-[#C41E1E]/80 hover:bg-[#C41E1E] transition-colors relative"
                style={{ height: `${hC}%`, minHeight: d.clicks > 0 ? 2 : 0 }}>
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white z-10">
                  {d.date.slice(5)} · 클릭 {d.clicks} · 방문 {d.visitors}
                  {d.gmv > 0 && <><br />매출 {fmtPrice(d.gmv)}</>}
                </div>
              </div>
              {hasGmv && d.gmv > 0 && (
                <div className="w-full rounded-t-sm bg-green-500/80" style={{ height: `${hG}%`, minHeight: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-gray-400">
        <span>{daily[0]?.date.slice(5) || ""}</span>
        <span>{daily[daily.length - 1]?.date.slice(5) || ""}</span>
      </div>
    </div>
  );
}

function SourceChart({ sources }: { sources: StatsResponse["by_source"] }) {
  const total = sources.reduce((s, x) => s + x.clicks, 0);
  let cumul = 0;
  const r = 56, cx = 70, cy = 70;
  const arcs = sources.map((s) => {
    const start = cumul / total;
    cumul += s.clicks;
    const end = cumul / total;
    const sa = start * 2 * Math.PI - Math.PI / 2;
    const ea = end * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
    const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
    const large = end - start > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const color = SOURCE_META[s.source]?.color || "#9CA3AF";
    return { d, color, source: s.source };
  });
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">유입 경로</h3>
      {total === 0 ? (
        <div className="flex items-center justify-center h-32 text-xs text-gray-400">
          아직 유입 없음 — UTM 링크 공유 후 채워집니다
        </div>
      ) : (
        <div className="flex gap-4 items-center">
          <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
            <circle cx="70" cy="70" r="56" fill="white" />
            {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} stroke="white" strokeWidth={1.5} />)}
            <circle cx="70" cy="70" r="32" fill="white" />
            <text x="70" y="72" textAnchor="middle" className="text-[11px] font-bold fill-gray-900">{fmt(total)}</text>
            <text x="70" y="84" textAnchor="middle" className="text-[8px] fill-gray-400">total</text>
          </svg>
          <div className="flex-1 space-y-1.5 min-w-0">
            {sources.slice(0, 6).map((s) => {
              const m = SOURCE_META[s.source] || { label: s.source, color: "#9CA3AF" };
              return (
                <div key={s.source} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: m.color }} />
                  <span className="text-xs text-gray-700 flex-1 truncate">{m.label}</span>
                  <span className="text-xs font-bold text-gray-900">{s.pct}%</span>
                </div>
              );
            })}
            {sources.length > 6 && <p className="text-[10px] text-gray-400">+ {sources.length - 6}개 더</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignWidget({ campaigns }: { campaigns: StatsResponse["active_campaigns"] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">진행 공구</h3>
        <span className="text-[10px] text-gray-400">{campaigns.length}건</span>
      </div>
      {campaigns.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">현재 진행 중인 공구가 없어요</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const colorFor = c.achievement_rate >= 80 ? "#10B981" : c.achievement_rate >= 50 ? "#EAB308" : "#C41E1E";
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {c.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.image} alt="" className="w-full h-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center text-gray-300">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <p className="truncate text-xs font-bold text-gray-900">{c.product_name}</p>
                    <span className="text-[10px] font-bold text-gray-500 ml-2">D-{c.d_day}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${Math.min(100, c.achievement_rate)}%`, background: colorFor }} />
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-[10px] text-gray-500">
                    <span>{fmtPrice(c.actual_gmv)}</span>
                    <span><b style={{ color: colorFor }}>{c.achievement_rate}%</b> / {fmtPrice(c.target_gmv)}</span>
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

function ContentEngagementWidget({ content }: { content: StatsResponse["content"] }) {
  if (!content.available) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎬</span>
          <h3 className="text-sm font-bold text-gray-900">시청자 반응</h3>
          <StatusBadge status="pending" label="외부 연동 대기" />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{content.message}</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: "👁", label: "조회수", v: "—" },
            { icon: "❤️", label: "좋아요", v: "—" },
            { icon: "💬", label: "댓글", v: "—" },
            { icon: "🔖", label: "저장", v: "—" },
          ].map((x) => (
            <div key={x.label} className="rounded-lg bg-white border border-gray-200 p-2 text-center">
              <p className="text-base">{x.icon}</p>
              <p className="text-sm font-bold text-gray-300 mt-0.5">{x.v}</p>
              <p className="text-[10px] text-gray-400">{x.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/integrations" className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-2 text-center text-[11px] font-bold text-white hover:bg-[#A01818]">
            YouTube 연동
          </a>
          <a href="/dashboard/integrations" className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white py-2 text-center text-[11px] font-bold text-gray-700 hover:bg-gray-50">
            Instagram 연동
          </a>
        </div>
      </div>
    );
  }

  const t = content.totals;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎬</span>
        <h3 className="text-sm font-bold text-gray-900">시청자 반응</h3>
        <span className="ml-auto text-[10px] text-gray-400">{content.sources.join(" + ")}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <p className="text-lg">👁</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{shortNum(t.views)}</p>
          <p className="text-[10px] text-gray-500">조회수</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <p className="text-lg">❤️</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{shortNum(t.likes)}</p>
          <p className="text-[10px] text-gray-500">좋아요</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <p className="text-lg">💬</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{shortNum(t.comments)}</p>
          <p className="text-[10px] text-gray-500">댓글</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <p className="text-lg">🔖</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{shortNum(t.saves)}</p>
          <p className="text-[10px] text-gray-500">저장</p>
        </div>
      </div>
      {content.top_content.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase">매출 기여 TOP 콘텐츠</p>
          {content.top_content.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2">
              <div className="h-9 w-9 shrink-0 rounded bg-gray-100 overflow-hidden">
                {c.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : <div className="flex h-full items-center justify-center text-gray-300 text-xs">🎬</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-gray-900">{c.title}</p>
                <p className="text-[10px] text-gray-400">조회 {shortNum(c.views)} · 매출 {fmtPrice(c.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightsCard({ insights }: { insights: StatsResponse["insights"] }) {
  if (insights.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50/50 to-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="text-sm font-bold text-gray-900">자동 인사이트</h3>
      </div>
      <div className="space-y-2">
        {insights.map((ins, i) => {
          const color = ins.type === "positive" ? "border-green-200 bg-green-50/50" : ins.type === "warning" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-white";
          const icon = ins.type === "positive" ? "✨" : ins.type === "warning" ? "⚠️" : "💡";
          return (
            <div key={i} className={`rounded-lg border p-3 ${color}`}>
              <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span>{icon}</span>{ins.title}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600 leading-relaxed">{ins.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 메인 ───
export default function Stats() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/stats?days=${days}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(async (e) => {
        const msg = typeof e?.json === "function" ? (await e.json().catch(() => null))?.error : "";
        if (alive) { setError(msg || "데이터를 불러올 수 없습니다"); setLoading(false); }
      });
    return () => { alive = false; };
  }, [days]);

  const ctr = useMemo(() => {
    if (!data || data.totals.unique_visitors === 0) return "—";
    return `${Math.round((data.totals.clicks / data.totals.unique_visitors) * 100)}%`;
  }, [data]);

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">통계</h2>
          <p className="mt-0.5 text-xs text-gray-500">유입 · 클릭 · 매출 · 영업이익 · 시청자 반응</p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                days === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <p className="mt-1 text-[11px] text-red-600/70">
            pick_clicks 테이블이 아직 Supabase에 생성되지 않았다면 migrations/20260422_pick_clicks.sql을 실행해주세요.
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* 핵심 6 KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <KpiTile
              icon="👀" label="유입" value={fmt(data.totals.unique_visitors)}
              subtext="고유 방문자"
              delta={data.totals.delta.visitors}
              status="live" statusLabel="실시간"
            />
            <KpiTile
              icon="👆" label="클릭" value={fmt(data.totals.clicks)}
              subtext={`CTR ${ctr}`}
              delta={data.totals.delta.clicks}
              status="live" statusLabel="실시간"
            />
            <KpiTile
              icon="💳" label="매출 GMV" value={data.totals.gmv > 0 ? fmtPrice(data.totals.gmv) : "—"}
              subtext={data.totals.orders > 0 ? `주문 ${data.totals.orders}건` : "공구 캠페인 진행 시"}
              status={data.totals.gmv > 0 ? "live" : "partial"}
              statusLabel={data.totals.gmv > 0 ? "공구" : "연동 대기"}
            />
            <KpiTile
              icon="💰" label="영업이익" value={data.totals.take_home > 0 ? fmtPrice(data.totals.take_home) : "—"}
              subtext="크리에이터 몫 (60%)"
              status={data.totals.take_home > 0 ? "estimated" : "partial"}
              statusLabel={data.totals.take_home > 0 ? "추정" : "연동 대기"}
            />
            <KpiTile
              icon="🎬" label="시청자 반응" value={data.content.available ? shortNum(data.content.totals.views) : "—"}
              subtext={data.content.available ? "총 조회수" : "YT·IG 연동 시"}
              status={data.content.available ? "live" : "pending"}
              statusLabel={data.content.available ? "실시간" : "잠금"}
            />
            <KpiTile
              icon="🔥" label="진행 공구" value={data.active_campaigns.length > 0 ? `D-${data.active_campaigns[0].d_day}` : "—"}
              subtext={data.active_campaigns.length > 0 ? `${data.active_campaigns[0].achievement_rate}% 달성` : "현재 없음"}
              status={data.active_campaigns.length > 0 ? "live" : "pending"}
              statusLabel={data.active_campaigns.length > 0 ? "진행중" : "—"}
            />
          </div>

          {/* 퍼널 */}
          <div className="mb-5">
            <FunnelWidget funnel={data.funnel} content={data.content} />
          </div>

          {/* 일별 차트 + 유입 경로 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <DailyChart daily={data.daily} />
            <SourceChart sources={data.by_source} />
          </div>

          {/* 시청자 반응 + 진행 공구 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <ContentEngagementWidget content={data.content} />
            <CampaignWidget campaigns={data.active_campaigns} />
          </div>

          {/* TOP PICK */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">가장 많이 클릭된 상품 TOP 10</h3>
            {data.top_picks.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">아직 상품 클릭 데이터가 없어요</p>
            ) : (
              <div className="space-y-2">
                {data.top_picks.map((p, i) => {
                  const max = data.top_picks[0].clicks;
                  const pct = max > 0 ? (p.clicks / max) * 100 : 0;
                  return (
                    <div key={p.pick_id} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-gray-400">{i + 1}</span>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {p.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.image} alt="" className="w-full h-full object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-gray-300 text-xs">📦</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900">{p.name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-[#C41E1E]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-700">{p.clicks}</p>
                        {p.revenue > 0 && <p className="text-[9px] text-green-600">{fmtPrice(p.revenue)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 인사이트 + 캠페인별 클릭 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <InsightsCard insights={data.insights} />
            {data.by_campaign.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">캠페인별 클릭</h3>
                <p className="text-[10px] text-gray-400 mb-2">공유 링크 생성기에서 캠페인 태그 지정 시 집계</p>
                <div className="space-y-1.5">
                  {data.by_campaign.map((c) => (
                    <div key={c.campaign} className="flex items-center gap-3">
                      <code className="text-[11px] bg-gray-50 rounded px-2 py-0.5 font-mono flex-1 truncate">{c.campaign}</code>
                      <span className="text-xs font-bold text-gray-700">{c.clicks}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 데이터 출처 안내 */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">데이터 출처</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
              {Object.entries(data.data_sources).map(([key, v]) => {
                const label = { clicks_visitors: "유입·클릭", gmv: "매출", take_home: "영업이익", content: "시청자 반응" }[key] || key;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <StatusBadge status={v.status} label={label} />
                    <span className="text-gray-500">{v.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
              ● 실시간 (자동 수집) · ◐ 부분 수집 (일부 외부 연동 필요) · ≈ 추정값 (정확한 정산 시 갱신) · ○ 외부 연동 대기
            </p>
          </div>
        </>
      )}
    </div>
  );
}
