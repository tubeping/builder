"use client";

import { useState } from "react";

// ─── 타입 ───
export type IntakePlatform = "youtube" | "instagram" | "tiktok";

export type IntakeAgeData = Record<string, string>;

export interface IntakeChannelInput {
  platform: IntakePlatform;
  url: string;
  name: string;
  followers: string;
  category: string;
  bio: string;
  // 시청자 인사이트 (플랫폼 원본 구간)
  ages: IntakeAgeData;
  genderFemale: string;
  topRegion: string;
  interests: string;
  // 커머스
  hasShop: boolean;
  prevCollab: string;
  preferCategories: string[];
}

// 플랫폼 원본 연령 구간 (YouTube/Instagram 동일, TikTok은 55+ 통합)
const AGE_RANGES_YT_IG = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
const AGE_RANGES_TT = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"] as const;

const PLATFORMS: { key: IntakePlatform; label: string; icon: string; placeholder: string }[] = [
  { key: "youtube", label: "YouTube", icon: "▶", placeholder: "https://youtube.com/@채널명" },
  { key: "instagram", label: "Instagram", icon: "◎", placeholder: "https://instagram.com/계정명" },
  { key: "tiktok", label: "TikTok", icon: "♪", placeholder: "https://tiktok.com/@계정명" },
];

const CATEGORIES = [
  "건강/웰빙", "뷰티/스킨케어", "패션", "푸드/요리", "육아/키즈",
  "테크/가전", "홈/인테리어", "스포츠/피트니스", "반려동물", "재테크/경제",
  "여행", "교육/자기계발", "엔터테인먼트", "기타",
];

const PRODUCT_CATEGORIES = [
  "건강식품", "화장품/미용", "식품", "생활/건강", "패션의류",
  "디지털/가전", "출산/육아", "스포츠/레저", "반려동물", "가구/인테리어",
];

const CATEGORY_EMOJI: Record<string, string> = {
  "건강식품": "💊", "화장품/미용": "💄", "식품": "🍱", "생활/건강": "🧴",
  "패션의류": "👗", "디지털/가전": "📱", "출산/육아": "🍼", "스포츠/레저": "⚽",
  "반려동물": "🐶", "가구/인테리어": "🛋",
};

const PLATFORM_COMMERCE: Record<IntakePlatform, { label: string; options: string[] }> = {
  youtube: { label: "유튜브 쇼핑 탭", options: ["쇼핑 탭 연동", "설명란 링크", "없음"] },
  instagram: { label: "인스타 쇼핑", options: ["쇼핑 태그", "스토리 링크", "프로필 링크만", "없음"] },
  tiktok: { label: "틱톡 쇼핑", options: ["TikTok Shop", "프로필 링크만", "없음"] },
};

const DEFAULT_INPUT: IntakeChannelInput = {
  platform: "youtube",
  url: "", name: "", followers: "", category: "", bio: "",
  ages: {},
  genderFemale: "",
  topRegion: "",
  interests: "",
  hasShop: false,
  prevCollab: "",
  preferCategories: [],
};

// ── 스크린샷 OCR: GPT-4o Vision으로 연령/성별 자동 추출 ──
async function parseInsightScreenshot(
  file: File,
): Promise<{ ages: IntakeAgeData; genderFemale?: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch("/api/parse-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) resolve(await res.json());
        else resolve(null);
      } catch {
        resolve(null);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ─── 메인 컴포넌트 ───
interface ProductRecommendIntakeProps {
  onSubmit: (input: IntakeChannelInput) => Promise<void> | void;
}

export default function ProductRecommendIntake({ onSubmit }: ProductRecommendIntakeProps) {
  const [input, setInput] = useState<IntakeChannelInput>(DEFAULT_INPUT);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentPlatform = PLATFORMS.find((p) => p.key === input.platform)!;
  const updateInput = (patch: Partial<IntakeChannelInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));

  const togglePreferCategory = (cat: string) => {
    setInput((prev) => ({
      ...prev,
      preferCategories: prev.preferCategories.includes(cat)
        ? prev.preferCategories.filter((c) => c !== cat)
        : [...prev.preferCategories, cat],
    }));
  };

  const handleSubmit = async () => {
    if (!input.name || !input.followers) return;
    setIsAnalyzing(true);
    try {
      await onSubmit(input);
      setSubmitted(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-1.5 text-base font-bold text-gray-900">분석 요청이 접수되었습니다</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-900">{input.name}</span> 채널 분석을 시작합니다.
          <br />보통 1~2영업일 내 추천 결과가 준비됩니다.
        </p>
        {input.preferCategories.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {input.preferCategories.map((cat) => (
              <span key={cat} className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600">
                {CATEGORY_EMOJI[cat] || "📦"} {cat}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={() => { setSubmitted(false); setStep(1); }}
          className="mt-5 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          다시 입력하기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900">맞춤 상품 추천 시작하기</h3>
        <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
          채널 정보를 입력하면 시청자 분석 기반으로 공구 가능한 상품을 추천해드려요.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* 스텝 인디케이터 */}
        <div className="mb-6 flex items-center gap-2">
          {[
            { n: 1, label: "기본 정보" },
            { n: 2, label: "시청자 인사이트" },
            { n: 3, label: "상품 선호" },
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(s.n as 1 | 2 | 3)}
                className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s.n
                    ? "bg-[#C41E1E] text-white"
                    : step > s.n
                      ? "bg-[#111111] text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </button>
              <span className={`text-xs font-medium ${step === s.n ? "text-gray-900" : "text-gray-400"}`}>
                {s.label}
              </span>
              {idx < 2 && <div className="h-px flex-1 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: 기본 정보 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">플랫폼</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => updateInput({ platform: p.key })}
                    className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-center transition-colors ${
                      input.platform === p.key
                        ? "border-[#C41E1E] bg-[#fffbfb]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <p className={`mt-1 text-xs font-medium ${
                      input.platform === p.key ? "text-[#C41E1E]" : "text-gray-600"
                    }`}>{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">채널 URL</label>
              <input
                type="text"
                value={input.url}
                onChange={(e) => updateInput({ url: e.target.value })}
                placeholder={currentPlatform.placeholder}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  채널명 <span className="text-[#C41E1E]">*</span>
                </label>
                <input
                  type="text"
                  value={input.name}
                  onChange={(e) => updateInput({ name: e.target.value })}
                  placeholder="채널/계정 이름"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  {input.platform === "youtube" ? "구독자" : "팔로워"} 수 <span className="text-[#C41E1E]">*</span>
                </label>
                <input
                  type="text"
                  value={input.followers}
                  onChange={(e) => updateInput({ followers: e.target.value })}
                  placeholder="예: 52000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">주요 카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateInput({ category: cat })}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      input.category === cat
                        ? "bg-[#111111] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">채널 소개</label>
              <input
                type="text"
                value={input.bio}
                onChange={(e) => updateInput({ bio: e.target.value })}
                placeholder="어떤 콘텐츠를 주로 만드시나요?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!input.name || !input.followers}
              className="w-full cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818] disabled:cursor-default disabled:bg-gray-300"
            >
              다음: 시청자 인사이트
            </button>
          </div>
        )}

        {/* ── STEP 2: 시청자 인사이트 ── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* 스크린샷 자동 입력 */}
            <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-[#C41E1E] transition-colors">
              <input
                type="file"
                accept="image/*"
                id="insight-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsAnalyzing(true);
                  const result = await parseInsightScreenshot(file);
                  if (result) {
                    const patch: Partial<IntakeChannelInput> = { ages: { ...input.ages, ...result.ages } };
                    if (result.genderFemale) patch.genderFemale = result.genderFemale;
                    updateInput(patch);
                  }
                  setIsAnalyzing(false);
                }}
              />
              <label htmlFor="insight-upload" className="cursor-pointer">
                <p className="text-2xl mb-1">{isAnalyzing ? "⏳" : "📷"}</p>
                <p className="text-sm font-medium text-gray-700">
                  {isAnalyzing ? "스크린샷 분석 중..." : "인사이트 스크린샷 업로드"}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  {input.platform === "youtube" ? "YouTube Studio → 분석 → 시청자" :
                   input.platform === "instagram" ? "Instagram → 프로페셔널 대시보드 → 팔로워" :
                   "TikTok → 크리에이터 도구 → 분석"}
                  {" "}화면을 캡처해서 올려주세요
                </p>
              </label>
            </div>

            {/* CSV 업로드 (YouTube Studio 내보내기) */}
            {input.platform === "youtube" && (
              <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-4 text-center">
                <input
                  type="file"
                  accept=".csv,.tsv"
                  id="csv-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsAnalyzing(true);
                    try {
                      const text = await file.text();
                      const lines = text.split("\n").filter(Boolean);
                      const ageMap: IntakeAgeData = {};
                      let femaleStr = "";
                      for (const line of lines) {
                        const cols = line.split(/[,\t]/);
                        const ageLabel = cols[0]?.trim();
                        const pctStr = cols[1]?.trim()?.replace("%", "");
                        if (ageLabel && pctStr && !isNaN(Number(pctStr))) {
                          if (ageLabel.includes("-") || ageLabel.includes("+")) {
                            ageMap[ageLabel] = pctStr;
                          }
                          if (ageLabel.toLowerCase().includes("female") || ageLabel.includes("여성")) {
                            femaleStr = pctStr;
                          }
                        }
                      }
                      const patch: Partial<IntakeChannelInput> = {};
                      if (Object.keys(ageMap).length > 0) patch.ages = { ...input.ages, ...ageMap };
                      if (femaleStr) patch.genderFemale = femaleStr;
                      if (Object.keys(patch).length > 0) updateInput(patch);
                    } catch { /* CSV 파싱 실패 무시 */ }
                    setIsAnalyzing(false);
                  }}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <p className="text-2xl mb-1">📊</p>
                  <p className="text-sm font-medium text-blue-700">YouTube Studio CSV 업로드</p>
                  <p className="mt-1 text-[11px] text-blue-400">
                    YouTube Studio → 분석 → 시청자 → 내보내기(CSV)
                  </p>
                </label>
              </div>
            )}

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-3 text-[11px] text-gray-400">또는 직접 입력</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* 연령 분포 — 플랫폼 원본 구간 */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-gray-700">
                  시청자 연령 분포 (%)
                </label>
                <span className="text-[10px] text-amber-600">⚠️ 자동 인식 결과는 부정확할 수 있어요 — 직접 확인 후 수정해주세요</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {(input.platform === "tiktok" ? [...AGE_RANGES_TT] : [...AGE_RANGES_YT_IG]).map((range) => (
                  <div key={range}>
                    <p className="mb-1 text-center text-[11px] text-gray-500">{range}</p>
                    <input
                      type="number"
                      min="0" max="100"
                      step="0.1"
                      value={input.ages[range] || ""}
                      onChange={(e) => updateInput({ ages: { ...input.ages, [range]: e.target.value } })}
                      placeholder="—"
                      className="w-full rounded-lg border border-gray-300 px-1.5 py-2 text-center text-sm outline-none focus:border-[#C41E1E]"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">
                합계가 100%가 아니어도 괜찮습니다. 비율로 자동 환산됩니다.
              </p>
            </div>

            {/* 성별 */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">성별 비율</label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-8">여성</span>
                <input
                  type="range"
                  min="0" max="100"
                  value={input.genderFemale || "50"}
                  onChange={(e) => updateInput({ genderFemale: e.target.value })}
                  className="flex-1 accent-[#C41E1E]"
                />
                <span className="text-xs text-gray-500 w-8">남성</span>
              </div>
              <p className="mt-1 text-center text-xs text-gray-600">
                여성 <span className="font-semibold text-[#C41E1E]">{input.genderFemale || 50}%</span>
                {" "}/{" "}
                남성 <span className="font-semibold">{100 - (parseInt(input.genderFemale) || 50)}%</span>
              </p>
            </div>

            {/* 관심사 */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                시청자 주요 관심사 / 키워드
              </label>
              <input
                type="text"
                value={input.interests}
                onChange={(e) => updateInput({ interests: e.target.value })}
                placeholder="건강식품, 다이어트, 피부관리 (쉼표로 구분)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>

            {/* 주요 지역 */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                상위 지역 (선택)
              </label>
              <input
                type="text"
                value={input.topRegion}
                onChange={(e) => updateInput({ topRegion: e.target.value })}
                placeholder="예: 서울, 경기"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]"
              >
                다음: 상품 선호
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 커머스/상품 선호 ── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* 쇼핑 기능 */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                {PLATFORM_COMMERCE[input.platform].label} 연동
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_COMMERCE[input.platform].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => updateInput({ hasShop: opt !== "없음", prevCollab: opt })}
                    className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      input.prevCollab === opt
                        ? "bg-[#111111] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 선호 상품 카테고리 (복수 선택) */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                추천받고 싶은 상품 카테고리 (복수 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => togglePreferCategory(cat)}
                    className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      input.preferCategories.includes(cat)
                        ? "bg-[#C41E1E] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {CATEGORY_EMOJI[cat] || "📦"} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 요약 미리보기 */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold text-gray-700">입력 요약</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-gray-500">플랫폼</span>
                <span className="font-medium text-gray-900">{currentPlatform.label}</span>
                <span className="text-gray-500">채널명</span>
                <span className="font-medium text-gray-900">{input.name || "—"}</span>
                <span className="text-gray-500">{input.platform === "youtube" ? "구독자" : "팔로워"}</span>
                <span className="font-medium text-gray-900">
                  {input.followers
                    ? parseInt(input.followers.replace(/,/g, "")).toLocaleString("ko-KR") + "명"
                    : "—"}
                </span>
                <span className="text-gray-500">카테고리</span>
                <span className="font-medium text-gray-900">{input.category || "—"}</span>
                <span className="text-gray-500">관심사</span>
                <span className="font-medium text-gray-900">{input.interests || "—"}</span>
                <span className="text-gray-500">추천 카테고리</span>
                <span className="font-medium text-gray-900">
                  {input.preferCategories.join(", ") || "자동 선정"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={isAnalyzing}
                className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818] disabled:cursor-default disabled:bg-gray-400"
              >
                {isAnalyzing ? "분석 요청 중..." : "분석 요청 보내기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
