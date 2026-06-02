"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HOOK_TYPE_LABEL,
  FRAME_LABEL,
  CTA_PATTERN_LABEL,
  SECTION_LABEL,
  type HookType,
  type FrameType,
  type CTAPattern,
  type SectionName,
  type EmotionFlowEntry,
  type CutDetails,
} from "@/lib/prompts/reelAnalysis";

interface AnalyzedReel {
  id: string;
  url: string;
  duration_sec: number;
  category: string | null;
  hook_score: number | null;
  cta_strength: number | null;
  gframe: {
    hook: { type: HookType; duration_sec: number; text: string; score: number };
    structure: {
      frame: FrameType;
      sections: { name: SectionName; range: string; text: string }[];
    };
    cta: { pattern: CTAPattern; range: string; text: string; strength: number };
  } | null;
  persuasion_tags: string[] | null;
  notes: string;
  is_favorite: boolean;
  status: "pending" | "analyzing" | "completed" | "failed";
  created_at: string;

  // v0.5: 분석 차원 4개 확장 (GET 응답에 포함 시 표시, 없어도 OK)
  emotion_flow?: EmotionFlowEntry[] | null;
  desire_triggers?: string[] | null;
  cut_details?: CutDetails | null;
  extracted_pattern?: string | null;
}

interface Props {
  onUseAsReference?: (reelId: string) => void;
}

export default function ReelAnalyzer({ onUseAsReference }: Props) {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reels, setReels] = useState<AnalyzedReel[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  // v0.5: 다중 URL 일괄 분석 (채널 분석용)
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; current?: string } | null>(null);
  const [batchErrors, setBatchErrors] = useState<{ url: string; error: string }[]>([]);

  const loadReels = useCallback(async () => {
    try {
      const r = await fetch("/api/reels/analyze");
      if (r.ok) {
        const data = await r.json();
        setReels(data);
      }
    } catch {
      /* ignore — empty list */
    }
  }, []);

  useEffect(() => {
    loadReels();
  }, [loadReels]);

  async function handleAnalyze() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = await fetch("/api/reels/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.error || "분석 실패");
      }
      setUrl("");
      await loadReels();
      setExpandedId(data.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  // v0.5: 채널 분석용 다중 URL 일괄 분석
  async function handleBatchAnalyze() {
    const urls = batchUrls
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    if (urls.length > 20) {
      setError("한 번에 최대 20개까지 분석할 수 있어요");
      return;
    }
    setAnalyzing(true);
    setError(null);
    setBatchErrors([]);
    setBatchProgress({ total: urls.length, done: 0 });

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      setBatchProgress({ total: urls.length, done: i, current: u });
      try {
        const r = await fetch("/api/reels/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: u }),
        });
        const data = await r.json();
        if (!r.ok) {
          setBatchErrors((prev) => [...prev, { url: u, error: data.error || "분석 실패" }]);
        }
      } catch (e) {
        setBatchErrors((prev) => [...prev, { url: u, error: (e as Error).message }]);
      }
    }

    setBatchProgress({ total: urls.length, done: urls.length });
    setBatchUrls("");
    await loadReels();
    setAnalyzing(false);
    // progress 표시는 5초 후 자동 사라짐
    setTimeout(() => setBatchProgress(null), 5000);
  }

  async function handleToggleFavorite(reel: AnalyzedReel) {
    const r = await fetch(`/api/reels/analyze/${reel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: !reel.is_favorite }),
    });
    if (r.ok) {
      setReels((prev) =>
        prev.map((x) =>
          x.id === reel.id ? { ...x, is_favorite: !reel.is_favorite } : x
        )
      );
    }
  }

  async function handleSaveNotes(reelId: string) {
    const r = await fetch(`/api/reels/analyze/${reelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft }),
    });
    if (r.ok) {
      setReels((prev) =>
        prev.map((x) => (x.id === reelId ? { ...x, notes: notesDraft } : x))
      );
      setEditingNotesId(null);
    }
  }

  async function handleDelete(reelId: string) {
    if (!confirm("이 분석 결과를 삭제할까요?")) return;
    const r = await fetch(`/api/reels/analyze/${reelId}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setReels((prev) => prev.filter((x) => x.id !== reelId));
      if (expandedId === reelId) setExpandedId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">영상 분석</h2>
        <p className="mt-1 text-sm text-gray-500">
          벤치마킹할 인스타 릴스 / 유튜브 쇼츠 링크를 붙여넣으면 훅·구조·CTA를 자동 분석해서 모아둡니다.
          나중에 대본 만들 때 이 톤을 그대로 적용할 수 있어요.
        </p>
      </div>

      {/* 사이트(Vercel) 미지원 안내 */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <p className="font-semibold">⚠ 영상 분석은 현재 사이트에서 미지원입니다</p>
        <p className="mt-1 leading-relaxed text-amber-800">
          영상 다운로드·음성 전사·장면 분석에 Python·yt-dlp·ffmpeg·Whisper가 필요한데
          Vercel 서버리스에는 없습니다. 로컬 개발 환경에서는 정상 동작하며,
          서버(Vultr) 이전이 끝나면 사이트에서도 활성화됩니다.
        </p>
      </div>

      {/* URL 입력 — 단일 / 일괄 모드 토글 */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        {/* 모드 토글 */}
        <div className="mb-3 flex gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setBatchMode(false)}
            disabled={analyzing}
            className={`cursor-pointer rounded-full px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              !batchMode ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            단일 영상 분석
          </button>
          <button
            type="button"
            onClick={() => setBatchMode(true)}
            disabled={analyzing}
            className={`cursor-pointer rounded-full px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              batchMode ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            채널 일괄 분석 (최대 20개)
          </button>
        </div>

        {!batchMode ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !analyzing) handleAnalyze();
                }}
                placeholder="릴스 또는 쇼츠 URL (instagram.com/reel/... 또는 youtube.com/shorts/...)"
                disabled={analyzing}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E] disabled:bg-gray-50"
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !url.trim()}
                className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a51919] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {analyzing ? "분석중..." : "분석"}
              </button>
            </div>
            {analyzing && !batchProgress && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-[#C41E1E]" />
                영상 다운로드 → 음성 전사 → 장면 분석 → G-FRAME 분류 (1~3분 소요)
              </div>
            )}
          </>
        ) : (
          <>
            <textarea
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              disabled={analyzing}
              rows={6}
              placeholder={`채널의 인기 영상 URL을 한 줄에 하나씩 입력 (최대 20개)\n\nhttps://www.instagram.com/reel/...\nhttps://www.youtube.com/shorts/...\nhttps://youtu.be/...`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E] disabled:bg-gray-50 font-mono"
            />
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {batchUrls.split(/\r?\n/).filter((u) => u.trim()).length} 개 URL · 영상당 1~3분 소요
              </span>
              <button
                onClick={handleBatchAnalyze}
                disabled={analyzing || batchUrls.split(/\r?\n/).filter((u) => u.trim()).length === 0}
                className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a51919] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {analyzing ? "일괄 분석중..." : "일괄 분석 시작"}
              </button>
            </div>
          </>
        )}

        {/* 일괄 진행률 */}
        {batchProgress && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-700">
                {batchProgress.done === batchProgress.total ? "✓ 일괄 분석 완료" : `분석중 ${batchProgress.done}/${batchProgress.total}`}
              </span>
              <span className="text-gray-500">{Math.round((batchProgress.done / batchProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-[#C41E1E] transition-all"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
              />
            </div>
            {batchProgress.current && batchProgress.done < batchProgress.total && (
              <p className="mt-1 text-gray-500 truncate">현재: {batchProgress.current}</p>
            )}
          </div>
        )}

        {/* 일괄 분석 에러 목록 */}
        {batchErrors.length > 0 && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs">
            <p className="font-medium text-red-700 mb-1">실패 {batchErrors.length}건:</p>
            <ul className="space-y-0.5 text-red-600">
              {batchErrors.slice(0, 5).map((e, i) => (
                <li key={i} className="truncate">
                  • {e.url} — {e.error}
                </li>
              ))}
              {batchErrors.length > 5 && <li>... 외 {batchErrors.length - 5}건</li>}
            </ul>
          </div>
        )}

        {error && !batchProgress && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* 저장된 분석 목록 */}
      {reels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-500">
            아직 분석한 릴스가 없습니다. 위에 URL을 붙여넣어 시작하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reels.map((reel) => {
            const isExpanded = expandedId === reel.id;
            const hook = reel.gframe?.hook;
            const cta = reel.gframe?.cta;
            return (
              <div
                key={reel.id}
                className="rounded-xl border border-gray-200 bg-white"
              >
                {/* 카드 헤더 */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => handleToggleFavorite(reel)}
                    className="cursor-pointer text-lg"
                    title={reel.is_favorite ? "즐겨찾기 해제" : "즐겨찾기"}
                  >
                    <span
                      className={
                        reel.is_favorite ? "text-[#C41E1E]" : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {reel.category && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {reel.category}
                        </span>
                      )}
                      {hook && (
                        <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-[#C41E1E]">
                          {HOOK_TYPE_LABEL[hook.type]}
                        </span>
                      )}
                      {reel.gframe?.structure.frame && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          {reel.gframe.structure.frame}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {reel.duration_sec}초
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-900">
                      {hook?.text || reel.url}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">훅</div>
                      <div className="font-semibold tabular-nums">
                        {reel.hook_score?.toFixed(1) ?? "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">CTA</div>
                      <div className="font-semibold tabular-nums">
                        {reel.cta_strength?.toFixed(1) ?? "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : reel.id)
                    }
                    className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {isExpanded ? "접기" : "상세"}
                  </button>
                </div>

                {/* 상세 패널 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4 text-sm">
                    {/* ★ 공식 카드 (가장 중요 — v0.5) */}
                    {reel.extracted_pattern && (
                      <div className="rounded-xl border-2 border-[#C41E1E]/30 bg-red-50/40 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-[#C41E1E]">★ 이 영상의 공식</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 leading-relaxed">
                          {reel.extracted_pattern}
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                          이 공식을 다음 대본 만들 때 그대로 적용할 수 있습니다.
                        </p>
                      </div>
                    )}

                    {hook && (
                      <Section title={`훅 (${HOOK_TYPE_LABEL[hook.type]})`}>
                        <p className="text-gray-900">{hook.text}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {hook.duration_sec}초 / 강도 {hook.score.toFixed(1)}
                        </p>
                      </Section>
                    )}

                    {reel.gframe?.structure && (
                      <Section title={`구조 — ${FRAME_LABEL[reel.gframe.structure.frame]}`}>
                        <ul className="space-y-2">
                          {reel.gframe.structure.sections.map((sec, i) => (
                            <li key={i} className="rounded-lg bg-gray-50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700">
                                  {SECTION_LABEL[sec.name] ?? sec.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {sec.range}
                                </span>
                              </div>
                              <p className="mt-1 text-gray-800">{sec.text}</p>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {cta && (
                      <Section title={`CTA (${CTA_PATTERN_LABEL[cta.pattern]})`}>
                        <p className="text-gray-900">{cta.text}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {cta.range} / 강도 {cta.strength.toFixed(1)}
                        </p>
                      </Section>
                    )}

                    {reel.persuasion_tags && reel.persuasion_tags.length > 0 && (
                      <Section title="설득 심리 태그">
                        <div className="flex flex-wrap gap-1.5">
                          {reel.persuasion_tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-800"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* v0.5 — 자극한 욕구 */}
                    {reel.desire_triggers && reel.desire_triggers.length > 0 && (
                      <Section title="자극한 시청자 욕구">
                        <div className="flex flex-wrap gap-1.5">
                          {reel.desire_triggers.map((t, i) => (
                            <span
                              key={i}
                              className="rounded bg-pink-50 px-2 py-0.5 text-xs text-pink-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* v0.5 — 감정 흐름 타임라인 */}
                    {reel.emotion_flow && reel.emotion_flow.length > 0 && (
                      <Section title="감정 흐름">
                        <ul className="space-y-1.5">
                          {reel.emotion_flow.map((e, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700 font-mono">
                                {e.range}
                              </span>
                              <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                                {e.emotion}
                              </span>
                              <span className="text-gray-600">{e.trigger}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {/* v0.5 — 컷 디테일 */}
                    {reel.cut_details && (
                      <Section title="컷 디테일">
                        <div className="space-y-2 text-xs">
                          <div className="flex gap-3 text-gray-600">
                            <span>총 컷 <strong className="text-gray-900">{reel.cut_details.total_cuts}</strong>개</span>
                            <span>평균 <strong className="text-gray-900">{reel.cut_details.avg_cut_sec.toFixed(1)}</strong>초</span>
                          </div>
                          {reel.cut_details.transition_styles && reel.cut_details.transition_styles.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {reel.cut_details.transition_styles.map((s, i) => (
                                <span key={i} className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-700">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {reel.cut_details.notable_cuts && reel.cut_details.notable_cuts.length > 0 && (
                            <ul className="space-y-1 mt-2">
                              {reel.cut_details.notable_cuts.map((c, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700 font-mono">{c.time}</span>
                                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">{c.type}</span>
                                  <span className="text-gray-600">{c.desc}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </Section>
                    )}

                    {/* 메모 */}
                    <Section title="메모">
                      {editingNotesId === reel.id ? (
                        <div>
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E]"
                            placeholder="이 릴스에서 배울 점·내 공구에 적용할 부분..."
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleSaveNotes(reel.id)}
                              className="cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#a51919]"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNotesId(reel.id);
                            setNotesDraft(reel.notes || "");
                          }}
                          className="cursor-pointer rounded-lg bg-gray-50 px-3 py-2 text-gray-700 hover:bg-gray-100"
                        >
                          {reel.notes || (
                            <span className="text-gray-400">
                              클릭해서 메모 추가...
                            </span>
                          )}
                        </div>
                      )}
                    </Section>

                    {/* 액션 */}
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <a
                        href={reel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        원본 릴스 보기
                      </a>
                      {onUseAsReference && (
                        <button
                          onClick={() => onUseAsReference(reel.id)}
                          className="cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#a51919]"
                        >
                          이 톤으로 대본 만들기 →
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(reel.id)}
                        className="ml-auto cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold text-gray-500">{title}</h4>
      {children}
    </div>
  );
}
