"use client";

import { useState, useEffect } from "react";

type SentRecord = {
  email: string;
  channelName: string | null;
  sentAt: string;
  replied: boolean;
  repliedAt: string | null;
};

// 더미: 실제로는 sent-emails.json + Gmail API 회신 체크 연동
const MOCK_SENT: SentRecord[] = [
  { email: "jungalmot@gmail.com", channelName: "정알못", sentAt: "2026-03-30", replied: true, repliedAt: "2026-03-30" },
  { email: "hcsallez9454@gmail.com", channelName: null, sentAt: "2026-03-30", replied: true, repliedAt: "2026-03-31" },
  { email: "ggambring@gmail.com", channelName: null, sentAt: "2026-03-30", replied: true, repliedAt: "2026-03-30" },
  { email: "diskcc99@gmail.com", channelName: null, sentAt: "2026-03-25", replied: true, repliedAt: "2026-03-26" },
  { email: "ksung91889@naver.com", channelName: null, sentAt: "2026-03-24", replied: false, repliedAt: null },
  { email: "rlacksgur456@gmail.com", channelName: null, sentAt: "2026-03-17", replied: false, repliedAt: null },
  { email: "dudwn7949@daum.net", channelName: "정성산TV", sentAt: "2026-03-11", replied: true, repliedAt: "2026-03-12" },
  { email: "gandahyo@gmail.com", channelName: null, sentAt: "2026-03-04", replied: false, repliedAt: null },
  { email: "cocjjang@naver.com", channelName: null, sentAt: "2026-02-24", replied: true, repliedAt: "2026-02-25" },
  { email: "rhs88738550@gmail.com", channelName: null, sentAt: "2026-02-23", replied: false, repliedAt: null },
  { email: "luadoll@naver.com", channelName: null, sentAt: "2026-02-22", replied: false, repliedAt: null },
  { email: "kimminha1993@gmail.com", channelName: null, sentAt: "2026-01-14", replied: false, repliedAt: null },
  { email: "hsparknews@gmail.com", channelName: "빨간아재", sentAt: "2026-01-06", replied: false, repliedAt: null },
  { email: "pjbjp24@naver.com", channelName: null, sentAt: "2025-12-16", replied: false, repliedAt: null },
  { email: "news_engine@daum.net", channelName: "뉴스엔진", sentAt: "2025-10-29", replied: true, repliedAt: "2025-11-01" },
  { email: "gunggeumso@gmail.com", channelName: "궁금소", sentAt: "2025-08-20", replied: false, repliedAt: null },
];

type FilterMode = "all" | "replied" | "no_reply";

export default function SentList() {
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    fetch("/sent-emails.json")
      .then((res) => res.json())
      .then((data: string[]) => setSentEmails(data))
      .catch(() => {});
  }, []);

  const totalSent = sentEmails.length;
  const repliedCount = MOCK_SENT.filter((r) => r.replied).length;
  const noReplyCount = MOCK_SENT.filter((r) => !r.replied).length;

  const filtered = MOCK_SENT.filter((r) => {
    if (filter === "replied" && !r.replied) return false;
    if (filter === "no_reply" && r.replied) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      return (
        r.email.toLowerCase().includes(kw) ||
        (r.channelName && r.channelName.toLowerCase().includes(kw))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">총 발송</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalSent.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">고유 이메일 기준</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">회신 받음</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{repliedCount}</p>
          <p className="text-xs text-gray-400 mt-1">
            회신율 {totalSent > 0 ? ((repliedCount / totalSent) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">미회신</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{noReplyCount}</p>
          <p className="text-xs text-gray-400 mt-1">팔로업 필요</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Gmail 추적</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{MOCK_SENT.length}</p>
          <p className="text-xs text-gray-400 mt-1">스레드 추적 중</p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: "all" as FilterMode, label: "전체" },
            { key: "replied" as FilterMode, label: "회신" },
            { key: "no_reply" as FilterMode, label: "미회신" },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filter === f.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="이메일 또는 채널명 검색..."
          className="flex-1 max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
        />
        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
          회신 자동 체크 (Gmail)
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            발송 완료 목록
            <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length}건)</span>
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-50">
              <th className="text-left px-6 py-3 font-medium">이메일</th>
              <th className="text-left px-3 py-3 font-medium">채널명</th>
              <th className="text-left px-3 py-3 font-medium">발송일</th>
              <th className="text-center px-3 py-3 font-medium">회신 여부</th>
              <th className="text-left px-3 py-3 font-medium">회신일</th>
              <th className="text-center px-6 py-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.email}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-6 py-3 text-sm text-blue-600">{r.email}</td>
                <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                  {r.channelName || <span className="text-gray-300">-</span>}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">{r.sentAt}</td>
                <td className="px-3 py-3 text-center">
                  {r.replied ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      회신
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      미회신
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">{r.repliedAt || "-"}</td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {!r.replied && (
                      <button className="text-xs text-[#C41E1E] font-medium hover:underline cursor-pointer">
                        팔로업
                      </button>
                    )}
                    {r.replied && (
                      <button className="text-xs text-blue-600 font-medium hover:underline cursor-pointer">
                        미팅 잡기
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 전체 발송 이메일 목록 (접기/펼치기) */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-6 py-4 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50">
          전체 발송 이메일 목록 ({totalSent.toLocaleString()}개) — 클릭하여 펼치기
        </summary>
        <div className="px-6 pb-4 max-h-[400px] overflow-y-auto">
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sentEmails.slice(0, 200).map((email) => (
              <span
                key={email}
                className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full"
              >
                {email}
              </span>
            ))}
            {sentEmails.length > 200 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-medium">
                +{sentEmails.length - 200}개 더
              </span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
