"use client";

/**
 * 공유 링크 생성기 — 크리에이터가 소스별로 UTM 붙은 링크를 1클릭 복사.
 *
 * 인스타 앱·카톡 등은 document.referrer가 비어 있어서 유입 소스 추적 불가.
 * 해결: 크리에이터가 플랫폼별로 다른 링크를 쓰고, 각 링크에 utm_source·utm_medium을 심음.
 */

import React, { useState, useEffect } from "react";

interface ShareTemplate {
  key: string;
  label: string;
  icon: string;
  utm_source: string;
  utm_medium: string;
  note?: string;
}

const TEMPLATES: ShareTemplate[] = [
  { key: "ig_bio",      label: "인스타 바이오",   icon: "📷", utm_source: "instagram", utm_medium: "bio",    note: "프로필 '웹사이트'란에 붙여넣기" },
  { key: "ig_story",    label: "인스타 스토리",   icon: "📸", utm_source: "instagram", utm_medium: "story",  note: "스토리 링크 스티커용" },
  { key: "yt_desc",     label: "유튜브 설명란",   icon: "🎬", utm_source: "youtube",   utm_medium: "desc",   note: "영상 고정 설명란 최상단" },
  { key: "yt_pinned",   label: "유튜브 고정댓글", icon: "📌", utm_source: "youtube",   utm_medium: "pinned", note: "고정 댓글로 달기" },
  { key: "kakao_dm",    label: "카톡·DM",        icon: "💬", utm_source: "kakao",     utm_medium: "dm",     note: "개인 메시지/오픈채팅용" },
  { key: "blog",        label: "네이버 블로그",   icon: "📝", utm_source: "naver",     utm_medium: "blog",   note: "블로그 본문 링크" },
  { key: "tiktok_bio",  label: "틱톡 바이오",    icon: "🎵", utm_source: "tiktok",    utm_medium: "bio",    note: "프로필 링크" },
  { key: "threads",     label: "스레드",         icon: "🧵", utm_source: "threads",   utm_medium: "post",   note: "게시물 링크" },
];

function buildLink(baseUrl: string, src: string, med: string, campaign: string): string {
  if (!baseUrl) return "";
  const sep = baseUrl.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ utm_source: src, utm_medium: med });
  if (campaign) params.set("utm_campaign", campaign);
  return `${baseUrl}${sep}${params.toString()}`;
}

export default function ShareLinks() {
  const [slug, setSlug] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    // /api/me에서 shop_slug 조회
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        const s = data?.shop_slug || data?.creator_shops?.[0]?.shop_slug;
        if (s) {
          setSlug(s);
          // 현재 호스트 기준으로 base URL 구성
          const host = typeof window !== "undefined" ? window.location.origin : "";
          setBaseUrl(`${host}/shop/${s}`);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch { /* ignore */ }
  };

  if (!slug) {
    return <div className="p-8 text-center text-sm text-gray-500">프로필 로드 중…</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">공유 링크 생성기</h2>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          플랫폼마다 다른 링크를 사용하면 <b>어디서 유입됐는지</b> 통계에서 정확히 볼 수 있어요.
          인스타 앱은 referrer를 주지 않으므로 <b>UTM 링크 사용이 필수</b>입니다.
        </p>
      </div>

      {/* 베이스 URL (편집 불가) */}
      <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">내 몰 주소</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-xs text-gray-700">{baseUrl}</code>
          <button
            onClick={() => copy(baseUrl, "base")}
            className="cursor-pointer shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            {copiedKey === "base" ? "✓ 복사됨" : "복사"}
          </button>
        </div>
      </div>

      {/* 캠페인 태그 (선택) */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-gray-700">
          캠페인 태그 <span className="text-gray-400 font-normal">(선택)</span>
          <span className="ml-2 text-[10px] text-gray-400">ex: spring_sale, new_video_20260501</span>
        </label>
        <input
          type="text"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
          placeholder="영문·숫자·하이픈만 (비워도 됨)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          같은 영상·같은 캠페인 단위로 성과를 보고 싶을 때 사용. 비워두면 소스/매체만으로 집계.
        </p>
      </div>

      {/* 템플릿 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {TEMPLATES.map((t) => {
          const link = buildLink(baseUrl, t.utm_source, t.utm_medium, campaign);
          const copied = copiedKey === t.key;
          return (
            <div
              key={t.key}
              className="rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{t.label}</p>
                  {t.note && <p className="text-[10px] text-gray-400 mt-0.5">{t.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 truncate rounded bg-gray-50 px-2 py-1.5 text-[10px] text-gray-500 font-mono">
                  {link.replace(/^https?:\/\//, "")}
                </code>
                <button
                  onClick={() => copy(link, t.key)}
                  className={`cursor-pointer shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    copied
                      ? "bg-green-100 text-green-700"
                      : "bg-[#C41E1E] text-white hover:bg-[#A01818]"
                  }`}
                >
                  {copied ? "✓ 복사됨" : "복사"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
        <p className="text-[11px] text-blue-900 leading-relaxed">
          💡 <b>활용 팁</b>: 유튜브 영상마다 <code className="bg-white px-1 py-0.5 rounded text-[10px]">캠페인 태그</code>를 다르게 넣으면
          “어떤 영상이 실제 구매로 이어졌는지”까지 통계 페이지에서 확인할 수 있어요.
        </p>
      </div>
    </div>
  );
}
