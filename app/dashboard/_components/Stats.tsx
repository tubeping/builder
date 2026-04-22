"use client";

/**
 * 통계 대시보드 — 크리에이터의 유입·클릭·소스 분포·TOP PICK
 *
 * 데이터 소스: /api/stats (pick_clicks 집계)
 * 기간 선택: 7 / 30 / 90일
 */

import React, { useEffect, useState, useMemo } from "react";

interface StatsResponse {
  totals: { clicks: number; unique_visitors: number; unique_picks: number; days: number };
  daily: { date: string; clicks: number; visitors: number }[];
  by_source: { source: string; clicks: number; pct: number }[];
  by_device: { device: string; clicks: number }[];
  top_picks: { pick_id: string; name: string; image: string | null; clicks: number }[];
  by_campaign: { campaign: string; clicks: number }[];
}

const SOURCE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  instagram:          { label: "인스타",  color: "#E1306C", icon: "📷" },
  youtube:            { label: "유튜브",  color: "#FF0000", icon: "🎬" },
  kakao:              { label: "카톡",    color: "#FAE100", icon: "💬" },
  naver:              { label: "네이버",  color: "#03C75A", icon: "N" },
  tiktok:             { label: "틱톡",    color: "#010101", icon: "🎵" },
  threads:            { label: "스레드",  color: "#000000", icon: "🧵" },
  tubeping:           { label: "튜핑",    color: "#C41E1E", icon: "🔗" },
  direct:             { label: "다이렉트", color: "#6B7280", icon: "→" },
  link:               { label: "SNS링크",  color: "#3B82F6", icon: "🔗" },
  banner:             { label: "배너",    color: "#F59E0B", icon: "🔥" },
  campaign_live:      { label: "공구LIVE", color: "#10B981", icon: "🔴" },
  tubeping_campaign:  { label: "공구",    color: "#C41E1E", icon: "🛍️" },
  coupang:            { label: "쿠팡",    color: "#F6502E", icon: "쿠" },
  own:                { label: "직접",    color: "#8B5CF6", icon: "✋" },
};

function KpiTile({ icon, label, value, subtext }: { icon: string; label: string; value: string | number; subtext?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold text-gray-900">{value}</p>
      {subtext && <p className="mt-0.5 text-[10px] text-gray-500">{subtext}</p>}
    </div>
  );
}

function DailyBarChart({ daily }: { daily: StatsResponse["daily"] }) {
  const max = Math.max(1, ...daily.map(d => d.clicks));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">일자별 클릭 추이</h3>
        <span className="text-[10px] text-gray-400">최대 {max}건/일</span>
      </div>
      <div className="flex items-end gap-0.5 h-28">
        {daily.map((d, i) => {
          const h = d.clicks > 0 ? Math.max(2, (d.clicks / max) * 100) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div
                className="w-full rounded-t-sm bg-[#C41E1E]/80 hover:bg-[#C41E1E] transition-colors relative"
                style={{ height: `${h}%`, minHeight: d.clicks > 0 ? 2 : 0 }}
              >
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[10px] text-white">
                  {d.date.slice(5)} · {d.clicks}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-gray-400">
        <span>{daily[0]?.date.slice(5) || ""}</span>
        <span>{daily[daily.length - 1]?.date.slice(5) || ""}</span>
      </div>
    </div>
  );
}

function SourcePie({ sources }: { sources: StatsResponse["by_source"] }) {
  const total = sources.reduce((s, x) => s + x.clicks, 0);
  // SVG 원형 차트 (대략)
  let cumul = 0;
  const r = 60;
  const cx = 70, cy = 70;
  const arcs = sources.map((s) => {
    const start = cumul / total;
    cumul += s.clicks;
    const end = cumul / total;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = end * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = end - start > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const color = SOURCE_LABEL[s.source]?.color || "#9CA3AF";
    return { d, color, source: s.source };
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">유입 경로</h3>
      {total === 0 ? (
        <div className="flex items-center justify-center h-32 text-xs text-gray-400">데이터 없음</div>
      ) : (
        <div className="flex gap-5 items-center">
          <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
            {arcs.map((a, i) => (
              <path key={i} d={a.d} fill={a.color} stroke="white" strokeWidth={1} />
            ))}
          </svg>
          <div className="flex-1 space-y-1.5 min-w-0">
            {sources.map((s) => {
              const info = SOURCE_LABEL[s.source] || { label: s.source, color: "#9CA3AF", icon: "•" };
              return (
                <div key={s.source} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: info.color }} />
                  <span className="text-xs text-gray-700 flex-1 truncate">{info.label}</span>
                  <span className="text-xs font-bold text-gray-900">{s.pct}%</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">{s.clicks}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
    if (!data) return "0%";
    const { clicks, unique_visitors } = data.totals;
    if (unique_visitors === 0) return "—";
    return `${Math.round((clicks / unique_visitors) * 100)}%`;
  }, [data]);

  const mobilePct = useMemo(() => {
    if (!data || data.totals.clicks === 0) return "—";
    const m = data.by_device.find(d => d.device === "mobile")?.clicks || 0;
    return `${Math.round((m / data.totals.clicks) * 100)}%`;
  }, [data]);

  const topSource = data?.by_source[0];

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">통계</h2>
          <p className="mt-0.5 text-xs text-gray-500">내 몰 유입과 클릭을 한눈에</p>
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

      {loading && <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" /></div>}

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
          {/* KPI 타일 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiTile icon="👀" label="방문자" value={data.totals.unique_visitors.toLocaleString()} subtext={`최근 ${data.totals.days}일 UV`} />
            <KpiTile icon="👆" label="총 클릭" value={data.totals.clicks.toLocaleString()} subtext={`${data.totals.unique_picks}개 상품`} />
            <KpiTile icon="📈" label="클릭/방문" value={ctr} subtext="평균 클릭 수" />
            <KpiTile icon="📱" label="모바일 비율" value={mobilePct} subtext={topSource ? `TOP: ${SOURCE_LABEL[topSource.source]?.label || topSource.source}` : "—"} />
          </div>

          {/* 차트 2열 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <DailyBarChart daily={data.daily} />
            <SourcePie sources={data.by_source} />
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
                      <span className="text-xs font-bold text-gray-700 w-12 text-right">{p.clicks}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 캠페인별 TOP */}
          {data.by_campaign.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">캠페인별 클릭</h3>
              <p className="text-[10px] text-gray-400 mb-2">공유 링크 생성기에서 캠페인 태그를 지정한 경우 집계됩니다</p>
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
        </>
      )}
    </div>
  );
}
