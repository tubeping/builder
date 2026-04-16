"use client";

import { useState, useEffect } from "react";

type Channel = {
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  avgViewCount: number;
  email: string;
  collectedAt: string;
  sent: boolean;
};

type Category = {
  key: string;
  name: string;
  totalChannels: number;
  withEmail: number;
  sentCount: number;
  channels: Channel[];
};

type CollectorDB = {
  categories: Category[];
  totalChannels: number;
  totalEmails: number;
  totalSent: number;
};

function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
}

type FilterMode = "all" | "with_email" | "sent" | "not_sent";

export default function EmailCollector() {
  const [db, setDb] = useState<CollectorDB | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetch("/collector-db.json")
      .then((res) => res.json())
      .then((data: CollectorDB) => setDb(data))
      .catch(() => {});
  }, []);

  if (!db) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        수집 데이터 로딩 중...
      </div>
    );
  }

  // 카테고리별 또는 전체 채널 리스트
  const allChannelsWithCat: (Channel & { catName: string })[] = [];
  for (const cat of db.categories) {
    if (selectedCat !== "all" && cat.key !== selectedCat) continue;
    for (const ch of cat.channels) {
      allChannelsWithCat.push({ ...ch, catName: cat.name });
    }
  }

  // 필터 적용
  const filtered = allChannelsWithCat.filter((ch) => {
    if (filter === "with_email" && !ch.email) return false;
    if (filter === "sent" && !ch.sent) return false;
    if (filter === "not_sent" && (ch.sent || !ch.email)) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      return (
        ch.channelName.toLowerCase().includes(kw) ||
        ch.email.toLowerCase().includes(kw)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // 선택된 카테고리 통계
  const selectedStats = selectedCat === "all"
    ? { channels: db.totalChannels, emails: db.totalEmails, sent: db.totalSent }
    : (() => {
        const cat = db.categories.find((c) => c.key === selectedCat);
        return cat
          ? { channels: cat.totalChannels, emails: cat.withEmail, sent: cat.sentCount }
          : { channels: 0, emails: 0, sent: 0 };
      })();

  const downloadCSV = (mode: "not_sent" | "all_email" | "filtered") => {
    let rows: (Channel & { catName: string })[] = [];
    if (mode === "not_sent") {
      rows = allChannelsWithCat.filter((ch) => ch.email && !ch.sent);
    } else if (mode === "all_email") {
      rows = allChannelsWithCat.filter((ch) => ch.email);
    } else {
      rows = filtered;
    }
    const header = "채널명,이메일,구독자,카테고리,발송여부,수집일\n";
    const csv = header + rows.map((ch) =>
      `"${ch.channelName}","${ch.email}",${ch.subscriberCount},"${ch.catName}",${ch.sent ? "발송" : "미발송"},"${ch.collectedAt?.split(" ")[0] || ""}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const catLabel = selectedCat === "all" ? "전체" : db.categories.find((c) => c.key === selectedCat)?.name || "";
    a.download = `미발송_${catLabel}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">총 수집 채널</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{db.totalChannels.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">6개 카테고리 합산</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">이메일 보유</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{db.totalEmails.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {db.totalChannels > 0 ? ((db.totalEmails / db.totalChannels) * 100).toFixed(1) : 0}% 보유율
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">메일 발송 완료</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{db.totalSent.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {db.totalEmails > 0 ? ((db.totalSent / db.totalEmails) * 100).toFixed(1) : 0}% 발송률
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">미발송 (이메일 有)</p>
          <p className="text-2xl font-bold text-[#C41E1E] mt-1">
            {(db.totalEmails - db.totalSent).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">신규 영업 대상</p>
        </div>
      </div>

      {/* 카테고리별 현황 */}
      <div className="grid grid-cols-6 gap-3">
        {db.categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => { setSelectedCat(selectedCat === cat.key ? "all" : cat.key); setPage(0); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCat === cat.key
                ? "border-[#C41E1E] bg-[#FFF0F5] ring-1 ring-[#C41E1E]/20"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-lg font-bold text-gray-900">{cat.totalChannels.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{cat.name}</p>
            <div className="flex items-center gap-2 mt-2 text-[10px]">
              <span className="text-green-600">{cat.withEmail} email</span>
              <span className="text-blue-600">{cat.sentCount} sent</span>
            </div>
          </button>
        ))}
      </div>

      {/* 필터 + 검색 */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: "all" as FilterMode, label: "전체", count: selectedStats.channels },
            { key: "with_email" as FilterMode, label: "이메일 有", count: selectedStats.emails },
            { key: "sent" as FilterMode, label: "발송됨", count: selectedStats.sent },
            { key: "not_sent" as FilterMode, label: "미발송", count: selectedStats.emails - selectedStats.sent },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(0); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filter === f.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label} ({f.count.toLocaleString()})
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => { setSearchKeyword(e.target.value); setPage(0); }}
          placeholder="채널명 또는 이메일 검색..."
          className="flex-1 max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
        />
        <button
          onClick={() => downloadCSV("not_sent")}
          className="px-4 py-2 bg-[#C41E1E] text-white text-xs font-medium rounded-lg hover:bg-[#A01818] cursor-pointer"
        >
          미발송 CSV 다운로드 ({(selectedStats.emails - selectedStats.sent).toLocaleString()}건)
        </button>
        <span className="text-xs text-gray-400">
          {filtered.length.toLocaleString()}건
          {selectedCat !== "all" && (
            <span className="ml-1 text-[#C41E1E] font-medium">
              ({db.categories.find((c) => c.key === selectedCat)?.name})
            </span>
          )}
        </span>
      </div>

      {/* 채널 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-50">
              <th className="text-center px-3 py-3 font-medium w-16">상태</th>
              <th className="text-left px-3 py-3 font-medium">채널명</th>
              {selectedCat === "all" && (
                <th className="text-left px-3 py-3 font-medium">카테고리</th>
              )}
              <th className="text-left px-3 py-3 font-medium">이메일</th>
              <th className="text-right px-3 py-3 font-medium">구독자</th>
              <th className="text-right px-3 py-3 font-medium">총 조회수</th>
              <th className="text-right px-3 py-3 font-medium">평균 조회수</th>
              <th className="text-right px-6 py-3 font-medium">수집일</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((ch) => (
              <tr
                key={ch.channelId}
                className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${
                  ch.sent ? "bg-blue-50/30" : ""
                }`}
              >
                <td className="px-3 py-2.5 text-center">
                  {ch.sent ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                      발송됨
                    </span>
                  ) : ch.email ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      대상
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                      없음
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                  {ch.channelName}
                </td>
                {selectedCat === "all" && (
                  <td className="px-3 py-2.5 text-xs text-gray-500">{ch.catName}</td>
                )}
                <td className="px-3 py-2.5 text-sm">
                  {ch.email ? (
                    <span className={ch.sent ? "text-gray-400" : "text-blue-600"}>{ch.email}</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-700 text-right">
                  {formatNumber(ch.subscriberCount)}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-700 text-right">
                  {formatNumber(ch.viewCount)}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-700 text-right">
                  {formatNumber(ch.avgViewCount)}
                </td>
                <td className="px-6 py-2.5 text-xs text-gray-500 text-right">
                  {ch.collectedAt?.split(" ")[0] || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length.toLocaleString()}건
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                이전
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
