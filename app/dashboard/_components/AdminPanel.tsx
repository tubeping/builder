"use client";

/**
 * 관리자 페이지 — admin/super_admin 전용.
 *
 * 크리에이터 목록 + 검색 + 통계 미리보기.
 * 행 클릭 시 그 크리에이터의 공개 몰을 새 탭으로 열거나, impersonate 가능(추후).
 */

import { useEffect, useState, useMemo } from "react";
import { Search, ExternalLink, ShieldCheck, Users, Activity } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/auth-roles";

interface AdminCreator {
  id: string;
  email: string;
  name: string | null;
  shop_slug: string | null;
  channel_url: string | null;
  platform: string | null;
  category: string | null;
  role: Role;
  subscriber_count: number | null;
  created_at: string;
  stats: {
    clicks_30d: number;
    visitors_30d: number;
    pick_total: number;
    pick_visible: number;
    active_campaigns: number;
  };
}

const ROLE_BADGE: Record<Role, { bg: string; color: string; icon: string }> = {
  super_admin: { bg: "bg-purple-100", color: "text-purple-700", icon: "🛡️" },
  admin: { bg: "bg-blue-100", color: "text-blue-700", icon: "⚙️" },
  creator: { bg: "bg-gray-100", color: "text-gray-600", icon: "👤" },
};

export default function AdminPanel() {
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  useEffect(() => {
    setLoading(true); setError("");
    fetch("/api/admin/creators")
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setCreators(d.creators || []); setLoading(false); })
      .catch(async (e) => {
        const msg = typeof e?.json === "function" ? (await e.json().catch(() => null))?.error : "";
        setError(msg || "권한이 없거나 데이터를 불러올 수 없어요");
        setLoading(false);
      });
  }, []);

  // 클라이언트 측 필터링 (검색·역할)
  const filtered = useMemo(() => {
    let arr = creators;
    if (roleFilter !== "all") arr = arr.filter(c => c.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.shop_slug || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [creators, roleFilter, search]);

  const totalClicks = useMemo(() => creators.reduce((s, c) => s + c.stats.clicks_30d, 0), [creators]);
  const totalVisitors = useMemo(() => creators.reduce((s, c) => s + c.stats.visitors_30d, 0), [creators]);
  const totalActive = useMemo(() => creators.reduce((s, c) => s + c.stats.active_campaigns, 0), [creators]);
  const adminCount = useMemo(() => creators.filter(c => c.role !== "creator").length, [creators]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
          <p className="text-sm text-red-700 font-bold">🛡️ {error}</p>
          <p className="mt-2 text-xs text-red-600/70">
            admin 또는 super_admin 권한이 있는 계정으로 로그인하세요.
            <br />
            SQL을 실행하지 않았다면 <code className="bg-white px-1.5 py-0.5 rounded text-[10px]">migrations/20260512_admin_roles.sql</code>을 먼저 실행해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            관리자
          </h2>
          <p className="mt-1 text-sm text-gray-500">모든 크리에이터 목록 + 활동 통계</p>
        </div>
      </div>

      {/* KPI 4타일 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryTile icon={<Users className="h-4 w-4 text-gray-400" />} label="크리에이터" value={creators.length.toLocaleString()} />
        <SummaryTile icon={<ShieldCheck className="h-4 w-4 text-purple-500" />} label="운영자" value={adminCount.toLocaleString()} />
        <SummaryTile icon={<Activity className="h-4 w-4 text-blue-500" />} label="30일 방문자" value={totalVisitors.toLocaleString()} />
        <SummaryTile icon={<Activity className="h-4 w-4 text-[#C41E1E]" />} label="진행 공구" value={totalActive.toLocaleString()} />
      </div>

      {/* 필터 바 */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 · 이메일 · 슬러그로 검색"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
        </div>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {(["all", "super_admin", "admin", "creator"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                roleFilter === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {r === "all" ? "전체" : r === "super_admin" ? "👑 super" : r === "admin" ? "⚙️ admin" : "👤 creator"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-gray-400">총 {totalClicks.toLocaleString()}건 클릭</span>
      </div>

      {/* 크리에이터 표 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
            <tr>
              <th className="text-left p-3">이름</th>
              <th className="text-left p-3">이메일</th>
              <th className="text-center p-3">권한</th>
              <th className="text-center p-3">플랫폼</th>
              <th className="text-right p-3">30일 방문</th>
              <th className="text-right p-3">30일 클릭</th>
              <th className="text-right p-3">PICK</th>
              <th className="text-center p-3">진행공구</th>
              <th className="text-center p-3 w-16">몰</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs text-gray-400">조건에 해당하는 크리에이터가 없어요</td>
              </tr>
            ) : (
              filtered.map((c) => {
                const badge = ROLE_BADGE[c.role];
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">
                      {c.name || "—"}
                      {c.shop_slug && <p className="text-[10px] text-gray-400 font-normal">/{c.shop_slug}</p>}
                    </td>
                    <td className="p-3 text-xs text-gray-500">{c.email}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full ${badge.bg} ${badge.color} px-2 py-0.5 text-[10px] font-bold`}>
                        <span>{badge.icon}</span>{ROLE_LABEL[c.role]}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs text-gray-500">{c.platform || "—"}</td>
                    <td className="p-3 text-right text-xs">
                      <span className={c.stats.visitors_30d > 0 ? "font-bold text-gray-900" : "text-gray-300"}>
                        {c.stats.visitors_30d.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs">
                      <span className={c.stats.clicks_30d > 0 ? "font-bold text-[#C41E1E]" : "text-gray-300"}>
                        {c.stats.clicks_30d.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs">
                      <span className="font-bold text-gray-900">{c.stats.pick_visible}</span>
                      <span className="text-gray-400"> / {c.stats.pick_total}</span>
                    </td>
                    <td className="p-3 text-center text-xs">
                      {c.stats.active_campaigns > 0
                        ? <span className="inline-block rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">{c.stats.active_campaigns}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      {c.shop_slug && (
                        <a href={`/shop/${c.shop_slug}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 text-center">
        🛡️ 관리자 페이지는 admin · super_admin 권한 보유자만 접근할 수 있어요. 데이터 변경은 신중히.
      </p>
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {icon}<span>{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
