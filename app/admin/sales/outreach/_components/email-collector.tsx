"use client";

import { useState, useRef } from "react";

type CollectedChannel = {
  channelId: string;
  channelName: string;
  email: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  avgViewCount: number;
  collectedAt: string;
  tag: "normal" | "excluded" | "sent";
};

// ── 제외 목록: 계약 중/진행 중 채널 ──
const CONTRACTED_CHANNELS = [
  "라쥬", "Lajuu", "단정한 살림", "리하살림", "게굴자덕", "이트렌드",
  "코믹마트", "킬링타임", "누기", "떠먹여주는TV", "이트렌드",
  "줌인센터", "편들어주는 파생방송", "Artube", "뉴스엔진", "뉴스반장",
  "완선부부", "빵시기", "트래블리즈", "노지고", "희예", "뽀록맨",
  "캠핑덕후", "배우리 프로", "라쥬", "리하살림", "개굴자덕",
  "신사임당", "정성산tv", "가로세로연구소", "박용민tv",
  "백운기의 정어리TV", "키즈", "머니코믹스", "슈카", "침착맨",
  "기안84", "이낙연", "강남허준 박용환", "아는형님",
];

// ── 제외 목록: 방송사/대기업/공공기관 등 ──
const EXCLUDE_CHANNELS = [
  // 방송사
  "JTBC", "조선", "Mnet", "SBS", "CJ ENM", "KBS", "EBS", "MBC",
  "tvN", "채널A", "연합뉴스", "YTN", "TBS",
  // 대기업
  "삼성", "현대", "롯데", "카카오", "네이버",
  // 금융
  "증권", "은행", "자산운용",
  // 엔터
  "SM Entertainment", "YG Entertainment", "JYP Entertainment",
  "HYBE", "빅히트", "멜론", "지니뮤직",
  // 게임사
  "넥슨", "넷마블", "크래프톤", "엔씨소프트",
  // e스포츠
  "LCK", "T1", "Gen.G", "KT Rolster",
  // 공공
  "공단", "공사", "Ministry", "청와대",
  // 기타 제외
  "ITSub잇섭", "KBS 다큐", "김작가 TV", "아는형님 Knowingbros",
  "김어준의 겸손은힘들다 뉴스공장", "월급쟁이부자들TV", "이재명",
  "법륜스님의 즉문즉설", "고성국TV", "한국불교 대표방송 BTN",
  "유 퀴즈 온 더 튜브", "궁금소", "김용민TV", "윤석열",
  "정청래 TV떴다!", "국민의힘TV", "인싸it", "짠한형 신동엽",
  "[팻뱅] 최욱의 매불쇼", "MBC PD수첩", "WWE", "백종원 PAIK JONG WON",
  "보경 Bokyoung", "M2", "세바시 강연 Sebasi Talk", "지식한입",
  "E트렌드", "주언규 joo earn gyu", "편들어주는 파생 방송",
];

// ── 기발송 채널 (이미 메일을 보낸 채널) ──
const SENT_CHANNELS = [
  "테크리뷰TV", "요리의신", "패션피플", "머니톡",
  "스마트홈가이드", "일상브이로그",
];

const MOCK_RESULTS: CollectedChannel[] = [
  { channelId: "UC001", channelName: "테크리뷰TV", email: "techreview@gmail.com", subscriberCount: 520000, viewCount: 89000000, videoCount: 342, avgViewCount: 260234, collectedAt: "2026-04-01", tag: "sent" },
  { channelId: "UC002", channelName: "일상브이로그", email: "daily_vlog@naver.com", subscriberCount: 180000, viewCount: 32000000, videoCount: 215, avgViewCount: 148837, collectedAt: "2026-04-01", tag: "sent" },
  { channelId: "UC003", channelName: "건강지킴이", email: null, subscriberCount: 95000, viewCount: 15000000, videoCount: 178, avgViewCount: 84270, collectedAt: "2026-04-01", tag: "normal" },
  { channelId: "UC004", channelName: "요리의신", email: "cook.god@gmail.com", subscriberCount: 310000, viewCount: 56000000, videoCount: 420, avgViewCount: 133333, collectedAt: "2026-04-01", tag: "sent" },
  { channelId: "UC010", channelName: "KBS 다큐", email: "kbs@kbs.co.kr", subscriberCount: 1200000, viewCount: 500000000, videoCount: 3200, avgViewCount: 156250, collectedAt: "2026-04-01", tag: "excluded" },
  { channelId: "UC005", channelName: "스마트홈가이드", email: "smarthome.guide@gmail.com", subscriberCount: 140000, viewCount: 21000000, videoCount: 156, avgViewCount: 134615, collectedAt: "2026-04-01", tag: "sent" },
  { channelId: "UC006", channelName: "패션피플", email: "fashionppl@outlook.com", subscriberCount: 420000, viewCount: 72000000, videoCount: 510, avgViewCount: 141176, collectedAt: "2026-04-01", tag: "sent" },
  { channelId: "UC011", channelName: "신사임당", email: null, subscriberCount: 2700000, viewCount: 800000000, videoCount: 1500, avgViewCount: 533333, collectedAt: "2026-04-01", tag: "excluded" },
  { channelId: "UC007", channelName: "게임천국", email: null, subscriberCount: 680000, viewCount: 150000000, videoCount: 890, avgViewCount: 168539, collectedAt: "2026-04-01", tag: "normal" },
  { channelId: "UC008", channelName: "머니톡", email: "moneytalk.biz@gmail.com", subscriberCount: 250000, viewCount: 41000000, videoCount: 312, avgViewCount: 131410, collectedAt: "2026-04-01", tag: "sent" },
  { channelId: "UC012", channelName: "홈쿡달인", email: "homecook@gmail.com", subscriberCount: 88000, viewCount: 12000000, videoCount: 245, avgViewCount: 48980, collectedAt: "2026-04-01", tag: "normal" },
  { channelId: "UC013", channelName: "뷰티클래스", email: "beautyclass@naver.com", subscriberCount: 320000, viewCount: 58000000, videoCount: 380, avgViewCount: 152632, collectedAt: "2026-04-01", tag: "normal" },
];

function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
}

type FilterTag = "all" | "normal" | "excluded" | "sent";

export default function EmailCollector() {
  const [query, setQuery] = useState("");
  const [minSubscribers, setMinSubscribers] = useState("10000");
  const [maxResults, setMaxResults] = useState("50");
  const [isCollecting, setIsCollecting] = useState(false);
  const [results, setResults] = useState<CollectedChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterTag, setFilterTag] = useState<FilterTag>("all");
  const [hideExcluded, setHideExcluded] = useState(true);
  const [showExcludePanel, setShowExcludePanel] = useState(false);
  const [excludeInput, setExcludeInput] = useState("");
  const [customExcludes, setCustomExcludes] = useState<string[]>([]);
  const [uploadedExcludes, setUploadedExcludes] = useState<string[]>([]);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 전체 제외 목록 (기본 + 계약 + 사용자 추가 + 업로드)
  const allExcludes = [...EXCLUDE_CHANNELS, ...CONTRACTED_CHANNELS, ...customExcludes, ...uploadedExcludes];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith(".json")) {
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          // JSON DB 형태: { "channel_id": { "채널명": "...", ... }, ... }
          const names: string[] = [];
          if (typeof data === "object" && !Array.isArray(data)) {
            for (const val of Object.values(data)) {
              const v = val as Record<string, unknown>;
              const name = v["채널명"] || v["channelName"] || v["channel_name"] || v["title"];
              if (typeof name === "string" && name.trim()) names.push(name.trim());
            }
          } else if (Array.isArray(data)) {
            for (const item of data) {
              const name = item["채널명"] || item["channelName"] || item["channel_name"] || item["title"];
              if (typeof name === "string" && name.trim()) names.push(name.trim());
            }
          }
          setUploadedExcludes(names);
          alert(`${file.name}에서 ${names.length}개 채널을 제외 목록에 추가했습니다.`);
        } catch {
          alert("JSON 파일 파싱에 실패했습니다.");
        }
      };
      reader.readAsText(file, "utf-8");
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      // 엑셀은 브라우저에서 직접 파싱 (SheetJS 없이 간이 처리)
      // 실제 구현 시 SheetJS(xlsx) 라이브러리 사용 권장
      alert("엑셀 파일은 JSON으로 변환 후 업로드해주세요.\n(향후 엑셀 직접 파싱 지원 예정)");
      setUploadFileName(null);
    } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const names = text
          .split(/[\r\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length < 100);
        setUploadedExcludes(names);
        alert(`${file.name}에서 ${names.length}개 채널을 제외 목록에 추가했습니다.`);
      };
      reader.readAsText(file, "utf-8");
    }

    // input 초기화 (같은 파일 재업로드 가능하게)
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCollect = () => {
    setIsCollecting(true);
    setTimeout(() => {
      // 실제로는 API 호출 후 tag를 자동 분류
      const tagged = MOCK_RESULTS.map((ch) => {
        const nameLower = ch.channelName.toLowerCase();
        const isExcluded = allExcludes.some((ex) => nameLower.includes(ex.toLowerCase()));
        const isSent = SENT_CHANNELS.some((s) => nameLower.includes(s.toLowerCase()));
        return { ...ch, tag: isExcluded ? "excluded" as const : isSent ? "sent" as const : "normal" as const };
      });
      setResults(tagged);
      setIsCollecting(false);
    }, 1500);
  };

  const addCustomExclude = () => {
    const trimmed = excludeInput.trim();
    if (trimmed && !customExcludes.includes(trimmed)) {
      setCustomExcludes([...customExcludes, trimmed]);
      setExcludeInput("");
    }
  };

  const removeCustomExclude = (name: string) => {
    setCustomExcludes(customExcludes.filter((e) => e !== name));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredResults = results.filter((ch) => {
    if (hideExcluded && ch.tag === "excluded") return false;
    if (filterTag !== "all" && ch.tag !== filterTag) return false;
    return true;
  });

  const selectableResults = filteredResults.filter((ch) => ch.tag === "normal" && ch.email);

  const toggleAll = () => {
    if (selected.size === selectableResults.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableResults.map((r) => r.channelId)));
    }
  };

  const emailCount = results.filter((r) => r.email).length;
  const excludedCount = results.filter((r) => r.tag === "excluded").length;
  const sentCount = results.filter((r) => r.tag === "sent").length;
  const normalCount = results.filter((r) => r.tag === "normal").length;

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">채널 검색</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">검색 키워드</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 유튜브 쇼핑, 먹방, 테크 리뷰..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">최소 구독자</label>
            <select
              value={minSubscribers}
              onChange={(e) => setMinSubscribers(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            >
              <option value="0">제한 없음</option>
              <option value="1000">1,000+</option>
              <option value="5000">5,000+</option>
              <option value="10000">10,000+</option>
              <option value="50000">50,000+</option>
              <option value="100000">100,000+</option>
              <option value="500000">500,000+</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">최대 수집 수</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            >
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
              <option value="200">200개</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleCollect}
            disabled={!query.trim() || isCollecting}
            className="px-6 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isCollecting ? "수집 중..." : "이메일 수집 시작"}
          </button>
          <button
            onClick={() => setShowExcludePanel(!showExcludePanel)}
            className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            제외 목록 관리 ({allExcludes.length}개)
          </button>
          {isCollecting && (
            <span className="text-sm text-gray-500">YouTube API에서 채널 정보를 가져오는 중...</span>
          )}
        </div>
      </div>

      {/* Exclude List Panel */}
      {showExcludePanel && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">제외 목록</h2>
            <button
              onClick={() => setShowExcludePanel(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 파일 업로드 + 채널 추가 입력 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustomExclude(); }}
              placeholder="제외할 채널명 입력..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            />
            <button
              onClick={addCustomExclude}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 cursor-pointer"
            >
              추가
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.txt,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-dashed border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              DB 파일 업로드
            </button>
          </div>

          {/* 업로드된 파일 정보 */}
          {uploadedExcludes.length > 0 && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-700">
                  기존 수집 DB에서 로드됨 ({uploadedExcludes.length}개 채널)
                  {uploadFileName && <span className="ml-1 font-normal text-indigo-500">— {uploadFileName}</span>}
                </p>
                <button
                  onClick={() => { setUploadedExcludes([]); setUploadFileName(null); }}
                  className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer"
                >
                  제거
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                {uploadedExcludes.slice(0, 50).map((ch) => (
                  <span key={ch} className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded-full">
                    {ch}
                  </span>
                ))}
                {uploadedExcludes.length > 50 && (
                  <span className="px-2 py-0.5 bg-indigo-200 text-indigo-700 text-[10px] rounded-full font-medium">
                    +{uploadedExcludes.length - 50}개 더
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 계약/진행 중 */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-green-700 mb-2">
              계약/진행 중 ({CONTRACTED_CHANNELS.length}개)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONTRACTED_CHANNELS.filter((v, i, a) => a.indexOf(v) === i).map((ch) => (
                <span key={ch} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                  {ch}
                </span>
              ))}
            </div>
          </div>

          {/* 방송사/대기업 등 */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              방송사/대기업/공공기관 등 ({EXCLUDE_CHANNELS.length}개)
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
              {EXCLUDE_CHANNELS.map((ch) => (
                <span key={ch} className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  {ch}
                </span>
              ))}
            </div>
          </div>

          {/* 사용자 추가 */}
          {customExcludes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-2">
                직접 추가 ({customExcludes.length}개)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customExcludes.map((ch) => (
                  <span
                    key={ch}
                    className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full flex items-center gap-1"
                  >
                    {ch}
                    <button
                      onClick={() => removeCustomExclude(ch)}
                      className="hover:text-orange-900 cursor-pointer"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h2 className="text-base font-semibold text-gray-900">수집 결과</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    전체 {results.length}개
                  </span>
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                    이메일 {emailCount}개
                  </span>
                </div>
              </div>
              <button
                disabled={selected.size === 0}
                className="px-4 py-2 bg-[#C41E1E] text-white text-xs font-medium rounded-lg hover:bg-[#A01818] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                선택 항목 CRM에 저장 ({selected.size}개)
              </button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {([
                  { key: "all" as FilterTag, label: "전체", count: results.length },
                  { key: "normal" as FilterTag, label: "신규 대상", count: normalCount },
                  { key: "sent" as FilterTag, label: "기발송", count: sentCount },
                  { key: "excluded" as FilterTag, label: "제외", count: excludedCount },
                ]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilterTag(f.key);
                      if (f.key === "excluded") setHideExcluded(false);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      filterTag === f.key
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideExcluded}
                  onChange={(e) => setHideExcluded(e.target.checked)}
                  className="rounded border-gray-300 cursor-pointer"
                />
                제외 채널 숨기기
              </label>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-50">
                <th className="text-left px-6 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === selectableResults.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="text-center px-2 py-3 font-medium">상태</th>
                <th className="text-left px-3 py-3 font-medium">채널명</th>
                <th className="text-left px-3 py-3 font-medium">이메일</th>
                <th className="text-right px-3 py-3 font-medium">구독자</th>
                <th className="text-right px-3 py-3 font-medium">총 조회수</th>
                <th className="text-right px-3 py-3 font-medium">평균 조회수</th>
                <th className="text-right px-3 py-3 font-medium">영상 수</th>
                <th className="text-right px-6 py-3 font-medium">수집일</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((ch) => {
                const isExcluded = ch.tag === "excluded";
                const isSent = ch.tag === "sent";
                const rowBg = isExcluded
                  ? "bg-gray-50 opacity-50"
                  : isSent
                    ? "bg-blue-50/40"
                    : "";

                return (
                  <tr
                    key={ch.channelId}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${rowBg}`}
                  >
                    <td className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(ch.channelId)}
                        onChange={() => toggleSelect(ch.channelId)}
                        disabled={isExcluded || isSent || !ch.email}
                        className="rounded border-gray-300 cursor-pointer disabled:opacity-30"
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      {isExcluded && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">
                          제외
                        </span>
                      )}
                      {isSent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                          발송됨
                        </span>
                      )}
                      {ch.tag === "normal" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          신규
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-3 text-sm font-medium ${isExcluded ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {ch.channelName}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {ch.email ? (
                        <span className={isExcluded ? "text-gray-400" : "text-blue-600"}>{ch.email}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right">
                      {formatNumber(ch.subscriberCount)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right">
                      {formatNumber(ch.viewCount)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right">
                      {formatNumber(ch.avgViewCount)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right">{ch.videoCount}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 text-right">{ch.collectedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
