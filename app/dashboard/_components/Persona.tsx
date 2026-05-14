"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Tv, Camera, Eye, ThumbsUp, MessageCircle } from "lucide-react";
import ReelAnalyzer from "./ReelAnalyzer";

const AGE_BUCKETS = [
  { key: "10s", label: "10대" },
  { key: "20s", label: "20대" },
  { key: "30s", label: "30대" },
  { key: "40s", label: "40대" },
  { key: "50plus", label: "50+" },
] as const;
type AgeKey = typeof AGE_BUCKETS[number]["key"];

interface VideoMeta {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}
interface ChannelMeta {
  id: string;
  handle?: string;
  title: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
  description?: string;
}
interface PersonaData {
  channel?: ChannelMeta;
  latestVideos?: VideoMeta[];
  topVideos?: VideoMeta[];
  extractedAt?: string;
  source?: "youtube" | "dummy";
  manualInput?: {
    audienceAge?: Partial<Record<AgeKey, number>>;
    audienceGender?: { male?: number; female?: number };
    instagramHandle?: string;
  };
}
interface CreatorMe {
  channel_url?: string | null;
  platform?: string | null;
  persona?: PersonaData | null;
}

function compact(n: number): string {
  if (!n) return "0";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString();
}
function relativeDate(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const day = Math.floor(diff / 86400000);
  if (day < 1) return "오늘";
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  if (day < 365) return `${Math.floor(day / 30)}달 전`;
  return `${Math.floor(day / 365)}년 전`;
}

function VideoGrid({ videos, emptyHint }: { videos: VideoMeta[]; emptyHint: string }) {
  if (!videos.length) {
    return <p className="text-xs text-gray-400 py-8 text-center">{emptyHint}</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {videos.map((v, idx) => (
        <a
          key={v.id}
          href={`https://www.youtube.com/watch?v=${v.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-xl border border-gray-200 overflow-hidden bg-white hover:border-[#C41E1E] transition-colors"
        >
          <div className="relative aspect-video bg-gray-100">
            {v.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
            )}
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
              #{idx + 1}
            </span>
          </div>
          <div className="p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{v.title}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{compact(v.viewCount)}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{compact(v.likeCount)}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{compact(v.commentCount)}</span>
              <span className="ml-auto">{relativeDate(v.publishedAt)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function Persona() {
  const [me, setMe] = useState<CreatorMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelUrl, setChannelUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  // 수기 입력 상태
  const [audienceAge, setAudienceAge] = useState<Record<AgeKey, number>>({
    "10s": 0, "20s": 0, "30s": 0, "40s": 0, "50plus": 0,
  });
  const [genderMale, setGenderMale] = useState<number>(50);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // 초기 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data: CreatorMe = await res.json();
        if (!alive) return;
        setMe(data);
        setChannelUrl(data.channel_url ?? "");
        const m = data.persona?.manualInput;
        if (m?.audienceAge) {
          setAudienceAge({
            "10s": m.audienceAge["10s"] ?? 0,
            "20s": m.audienceAge["20s"] ?? 0,
            "30s": m.audienceAge["30s"] ?? 0,
            "40s": m.audienceAge["40s"] ?? 0,
            "50plus": m.audienceAge["50plus"] ?? 0,
          });
        }
        if (m?.audienceGender?.male !== undefined) {
          setGenderMale(m.audienceGender.male);
        }
        if (m?.instagramHandle) setInstagramHandle(m.instagramHandle);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const persona = me?.persona ?? {};
  const channel = persona.channel;
  const latest = persona.latestVideos ?? [];
  const top = persona.topVideos ?? [];

  const handleExtract = useCallback(async () => {
    if (!channelUrl.trim()) {
      setExtractError("채널 URL을 입력해주세요");
      return;
    }
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch("/api/persona/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: channelUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? "추출 실패");
        return;
      }
      setMe(prev => ({ ...(prev ?? {}), channel_url: channelUrl.trim(), platform: "youtube", persona: data.persona }));
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setExtracting(false);
    }
  }, [channelUrl]);

  const ageSum = useMemo(() => Object.values(audienceAge).reduce((a, b) => a + b, 0), [audienceAge]);

  const handleSaveManual = useCallback(async () => {
    setSavingManual(true);
    try {
      const nextManual = {
        ...(persona.manualInput ?? {}),
        audienceAge,
        audienceGender: { male: genderMale, female: 100 - genderMale },
        instagramHandle: instagramHandle.trim() || undefined,
      };
      const nextPersona = { ...persona, manualInput: nextManual };
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: nextPersona }),
      });
      if (res.ok) {
        setMe(prev => ({ ...(prev ?? {}), persona: nextPersona }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
      }
    } finally {
      setSavingManual(false);
    }
  }, [persona, audienceAge, genderMale, instagramHandle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">페르소나 도출</h1>
        <p className="mt-1 text-sm text-gray-500">
          채널을 등록하면 최신 영상·인기 영상을 자동으로 추출합니다. 구독자 정보는 직접 입력해주세요.
        </p>
      </div>

      {/* 1) 채널 등록 (자동 추출 트리거) */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Tv className="h-4 w-4 text-[#C41E1E]" />
          유튜브 채널
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={channelUrl}
            onChange={(e) => { setChannelUrl(e.target.value); setExtractError(""); }}
            placeholder="https://youtube.com/@채널핸들"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
            onKeyDown={(e) => { if (e.key === "Enter") handleExtract(); }}
          />
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A01818] disabled:opacity-50 flex items-center gap-1.5 justify-center"
          >
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {channel ? "재추출" : "추출"}
          </button>
        </div>
        {extractError && <p className="mt-2 text-xs text-red-500">{extractError}</p>}

        {/* 채널 카드 */}
        {channel && (
          <div className="mt-4 flex items-center gap-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
            {channel.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.thumbnail} alt={channel.title} className="w-14 h-14 rounded-full object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{channel.title}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                <span>구독자 <b className="text-gray-900">{compact(channel.subscriberCount)}</b></span>
                <span>영상 <b className="text-gray-900">{compact(channel.videoCount)}</b></span>
                <span>총 조회 <b className="text-gray-900">{compact(channel.viewCount)}</b></span>
              </div>
            </div>
            {persona.source === "dummy" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                샘플 데이터 (API 키 필요)
              </span>
            )}
          </div>
        )}
      </section>

      {/* 2) 인스타그램 (1차: 핸들 입력만) */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4 text-[#C41E1E]" />
          인스타그램 <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">자동 추출 준비 중</span>
        </h2>
        <input
          type="text"
          value={instagramHandle}
          onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
          placeholder="instagram_handle (@ 없이)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
        />
      </section>

      {/* 3) 구독자 수기 입력 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">구독자 정보 (수기 입력)</h2>
        <p className="text-xs text-gray-500 mb-4">
          API로 받기 어려운 구독자 연령·성별 분포는 채널 분석 데이터를 보고 직접 입력해주세요.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 연령 분포 */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-bold text-gray-700">연령 분포 (%)</h3>
              <span className={`text-[10px] font-medium ${ageSum === 100 ? "text-green-600" : "text-amber-600"}`}>
                합계 {ageSum}% {ageSum !== 100 && "(100이어야 함)"}
              </span>
            </div>
            <div className="space-y-2">
              {AGE_BUCKETS.map((b) => (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="w-12 text-xs text-gray-700">{b.label}</span>
                  <input
                    type="range"
                    min={0} max={100}
                    value={audienceAge[b.key]}
                    onChange={(e) => setAudienceAge(prev => ({ ...prev, [b.key]: parseInt(e.target.value, 10) }))}
                    className="flex-1 accent-[#C41E1E]"
                  />
                  <input
                    type="number"
                    min={0} max={100}
                    value={audienceAge[b.key]}
                    onChange={(e) => setAudienceAge(prev => ({ ...prev, [b.key]: Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))) }))}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs text-right outline-none focus:border-[#C41E1E]"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 성별 */}
          <div>
            <h3 className="mb-2 text-xs font-bold text-gray-700">성별 비율 (%)</h3>
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-12 text-xs text-gray-700">남</span>
                <input
                  type="range" min={0} max={100} value={genderMale}
                  onChange={(e) => setGenderMale(parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#C41E1E]"
                />
                <span className="w-12 text-right text-xs font-bold text-gray-900">{genderMale}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-xs text-gray-700">여</span>
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C41E1E]" style={{ width: `${100 - genderMale}%` }} />
                </div>
                <span className="w-12 text-right text-xs font-bold text-gray-900">{100 - genderMale}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSaveManual}
            disabled={savingManual}
            className="cursor-pointer rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {savingManual ? "저장 중…" : "저장"}
          </button>
          {savedFlash && <span className="text-xs text-green-600 font-medium">✓ 저장됨</span>}
        </div>
      </section>

      {/* 4) 자동 추출 결과 */}
      {channel && (
        <>
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">최신 영상 10개</h2>
              {persona.extractedAt && (
                <span className="text-[10px] text-gray-400">추출: {new Date(persona.extractedAt).toLocaleString("ko-KR")}</span>
              )}
            </div>
            <VideoGrid videos={latest} emptyHint="영상 데이터가 없습니다" />
          </section>

          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3">조회수 TOP 10</h2>
            <VideoGrid videos={top} emptyHint="영상 데이터가 없습니다" />
          </section>
        </>
      )}

      {/* 5) ReelAnalyzer (영상별 상세 분석 — 기존 컴포넌트) */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-3">영상별 상세 분석</h2>
        <ReelAnalyzer />
      </section>
    </div>
  );
}
