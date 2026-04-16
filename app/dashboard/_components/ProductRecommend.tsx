"use client";

import { useState } from "react";

// ─── 타입 ───
type Platform = "youtube" | "instagram" | "tiktok";

// 플랫폼 원본 연령 구간 (YouTube/Instagram 동일, TikTok은 55+ 통합)
const AGE_RANGES_YT_IG = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
const AGE_RANGES_TT = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"] as const;

type AgeData = Record<string, string>;

interface ChannelInput {
  platform: Platform;
  url: string;
  name: string;
  followers: string;
  category: string;
  bio: string;
  // 시청자 인사이트 (플랫폼 원본 구간)
  ages: AgeData;
  genderFemale: string;
  topRegion: string;
  interests: string;
  // 커머스
  hasShop: boolean;
  prevCollab: string;
  preferCategories: string[];
}

interface ChannelPersona {
  platform: Platform;
  channelName: string;
  subscribers: number;
  tier: string;
  category: string;
  contentStyle: string;
  audience: {
    age: { label: string; pct: number }[];
    gender: { female: number; male: number };
    coreDemo: string;
    interests: string[];
    painPoints: string[];
    purchaseSignals: string[];
  };
  recommendedCategories: string[];
  channelStrengths: string[];
  collabFit: string;
}

interface RecommendProduct {
  id: string;
  keyword: string;
  category: string;
  stars: number;
  score: number;
  searchVolume: number;
  clicks: number;
  ctr: number;
  isShopping: boolean;
  contentScore: number;
  purchaseScore: number;
  demandScore: number;
  trendScore: number;
  audienceScore: number;
  trendTag?: string;
}

// ─── 상수 ───
const PLATFORMS: { key: Platform; label: string; icon: string; placeholder: string }[] = [
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

const PLATFORM_COMMERCE: Record<Platform, { label: string; options: string[] }> = {
  youtube: { label: "유튜브 쇼핑 탭", options: ["쇼핑 탭 연동", "설명란 링크", "없음"] },
  instagram: { label: "인스타 쇼핑", options: ["쇼핑 태그", "스토리 링크", "프로필 링크만", "없음"] },
  tiktok: { label: "틱톡 쇼핑", options: ["TikTok Shop", "프로필 링크만", "없음"] },
};

const DEFAULT_INPUT: ChannelInput = {
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
async function parseInsightScreenshot(file: File): Promise<{ ages: AgeData; genderFemale?: string } | null> {
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
        if (res.ok) {
          resolve(await res.json());
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ─── 더미: 추천 결과 (입력 완료 후 표시) ───
const DUMMY_RECOMMENDATIONS: Record<string, RecommendProduct[]> = {
  "건강식품": [
    { id: "r1", keyword: "비타민D 5000IU", category: "건강식품", stars: 5, score: 88.2, searchVolume: 74500, clicks: 8200, ctr: 3.2, isShopping: true, contentScore: 85, purchaseScore: 90, demandScore: 78, trendScore: 92, audienceScore: 95, trendTag: "급상승" },
    { id: "r2", keyword: "프로바이오틱스 유산균", category: "건강식품", stars: 5, score: 82.5, searchVolume: 112000, clicks: 12400, ctr: 2.8, isShopping: true, contentScore: 80, purchaseScore: 85, demandScore: 88, trendScore: 75, audienceScore: 88 },
    { id: "r3", keyword: "루테인 눈건강", category: "건강식품", stars: 4.5, score: 71.3, searchVolume: 45200, clicks: 5100, ctr: 2.5, isShopping: true, contentScore: 72, purchaseScore: 70, demandScore: 65, trendScore: 68, audienceScore: 82, trendTag: "시즌" },
    { id: "r4", keyword: "콜라겐 펩타이드", category: "건강식품", stars: 4.5, score: 68.9, searchVolume: 58300, clicks: 6800, ctr: 2.9, isShopping: true, contentScore: 75, purchaseScore: 65, demandScore: 70, trendScore: 60, audienceScore: 78 },
    { id: "r5", keyword: "오메가3 rTG", category: "건강식품", stars: 4, score: 62.1, searchVolume: 38700, clicks: 4200, ctr: 2.1, isShopping: true, contentScore: 68, purchaseScore: 60, demandScore: 58, trendScore: 65, audienceScore: 72 },
  ],
  "생활/건강": [
    { id: "r7", keyword: "전동칫솔 음파", category: "생활/건강", stars: 4.5, score: 72.8, searchVolume: 62100, clicks: 7300, ctr: 2.7, isShopping: true, contentScore: 70, purchaseScore: 75, demandScore: 72, trendScore: 68, audienceScore: 80 },
    { id: "r8", keyword: "공기청정기 소형", category: "생활/건강", stars: 4, score: 64.5, searchVolume: 48900, clicks: 5600, ctr: 2.3, isShopping: true, contentScore: 65, purchaseScore: 62, demandScore: 68, trendScore: 58, audienceScore: 72, trendTag: "시즌" },
    { id: "r9", keyword: "안마기 목어깨", category: "생활/건강", stars: 4, score: 61.2, searchVolume: 35400, clicks: 4100, ctr: 2.0, isShopping: true, contentScore: 60, purchaseScore: 65, demandScore: 55, trendScore: 62, audienceScore: 68 },
  ],
  "화장품/미용": [
    { id: "r11", keyword: "선크림 SPF50", category: "화장품/미용", stars: 5, score: 85.1, searchVolume: 98500, clicks: 11200, ctr: 3.5, isShopping: true, contentScore: 82, purchaseScore: 88, demandScore: 85, trendScore: 90, audienceScore: 82, trendTag: "급상승" },
    { id: "r12", keyword: "레티놀 크림", category: "화장품/미용", stars: 4.5, score: 73.4, searchVolume: 67200, clicks: 7800, ctr: 2.9, isShopping: true, contentScore: 72, purchaseScore: 70, demandScore: 75, trendScore: 68, audienceScore: 78 },
  ],
  "식품": [
    { id: "r14", keyword: "그릭요거트 무가당", category: "식품", stars: 4.5, score: 74.6, searchVolume: 55800, clicks: 6400, ctr: 2.6, isShopping: true, contentScore: 75, purchaseScore: 72, demandScore: 70, trendScore: 78, audienceScore: 80, trendTag: "급상승" },
    { id: "r15", keyword: "곤약젤리 다이어트", category: "식품", stars: 4, score: 63.2, searchVolume: 42100, clicks: 4900, ctr: 2.3, isShopping: true, contentScore: 65, purchaseScore: 60, demandScore: 62, trendScore: 65, audienceScore: 68 },
    { id: "r16", keyword: "닭가슴살 스테이크", category: "식품", stars: 4.5, score: 70.1, searchVolume: 68200, clicks: 7100, ctr: 2.4, isShopping: true, contentScore: 72, purchaseScore: 68, demandScore: 72, trendScore: 65, audienceScore: 75 },
    { id: "r17", keyword: "프로틴바 저당", category: "식품", stars: 4, score: 65.8, searchVolume: 51300, clicks: 5800, ctr: 2.2, isShopping: true, contentScore: 68, purchaseScore: 62, demandScore: 65, trendScore: 70, audienceScore: 68, trendTag: "급상승" },
    { id: "r18", keyword: "수제 그래놀라", category: "식품", stars: 4, score: 58.4, searchVolume: 32400, clicks: 3700, ctr: 1.9, isShopping: true, contentScore: 60, purchaseScore: 55, demandScore: 52, trendScore: 62, audienceScore: 65 },
  ],
  "패션의류": [
    { id: "f1", keyword: "오버핏 반팔티", category: "패션의류", stars: 5, score: 82.3, searchVolume: 125000, clicks: 14200, ctr: 3.1, isShopping: true, contentScore: 80, purchaseScore: 85, demandScore: 88, trendScore: 78, audienceScore: 82, trendTag: "급상승" },
    { id: "f2", keyword: "와이드 데님팬츠", category: "패션의류", stars: 4.5, score: 76.8, searchVolume: 89300, clicks: 10100, ctr: 2.8, isShopping: true, contentScore: 78, purchaseScore: 75, demandScore: 80, trendScore: 72, audienceScore: 78 },
    { id: "f3", keyword: "린넨 셔츠 남성", category: "패션의류", stars: 4.5, score: 71.2, searchVolume: 52400, clicks: 6100, ctr: 2.5, isShopping: true, contentScore: 72, purchaseScore: 70, demandScore: 68, trendScore: 75, audienceScore: 72, trendTag: "시즌" },
    { id: "f4", keyword: "스포츠 레깅스", category: "패션의류", stars: 4, score: 67.5, searchVolume: 71200, clicks: 8200, ctr: 2.6, isShopping: true, contentScore: 65, purchaseScore: 68, demandScore: 72, trendScore: 62, audienceScore: 70 },
    { id: "f5", keyword: "경량 패딩조끼", category: "패션의류", stars: 4, score: 61.9, searchVolume: 44500, clicks: 5000, ctr: 2.1, isShopping: true, contentScore: 62, purchaseScore: 60, demandScore: 58, trendScore: 68, audienceScore: 65, trendTag: "시즌" },
  ],
  "디지털/가전": [
    { id: "d1", keyword: "무선 이어폰 노이즈캔슬링", category: "디지털/가전", stars: 5, score: 86.7, searchVolume: 142000, clicks: 16500, ctr: 3.4, isShopping: true, contentScore: 88, purchaseScore: 85, demandScore: 90, trendScore: 82, audienceScore: 88, trendTag: "급상승" },
    { id: "d2", keyword: "로봇청소기 물걸레", category: "디지털/가전", stars: 5, score: 81.4, searchVolume: 98700, clicks: 11300, ctr: 3.0, isShopping: true, contentScore: 82, purchaseScore: 80, demandScore: 82, trendScore: 78, audienceScore: 85 },
    { id: "d3", keyword: "4K 빔프로젝터", category: "디지털/가전", stars: 4.5, score: 74.2, searchVolume: 67800, clicks: 7800, ctr: 2.7, isShopping: true, contentScore: 75, purchaseScore: 72, demandScore: 70, trendScore: 75, audienceScore: 80 },
    { id: "d4", keyword: "전기포트 온도조절", category: "디지털/가전", stars: 4, score: 66.8, searchVolume: 45600, clicks: 5200, ctr: 2.3, isShopping: true, contentScore: 68, purchaseScore: 65, demandScore: 65, trendScore: 62, audienceScore: 72 },
    { id: "d5", keyword: "미니PC 데스크탑", category: "디지털/가전", stars: 4, score: 62.3, searchVolume: 38900, clicks: 4500, ctr: 2.1, isShopping: true, contentScore: 65, purchaseScore: 60, demandScore: 58, trendScore: 65, audienceScore: 68, trendTag: "급상승" },
  ],
  "출산/육아": [
    { id: "b1", keyword: "아기 물티슈 저자극", category: "출산/육아", stars: 5, score: 84.5, searchVolume: 88200, clicks: 10100, ctr: 3.2, isShopping: true, contentScore: 85, purchaseScore: 88, demandScore: 82, trendScore: 78, audienceScore: 90 },
    { id: "b2", keyword: "유아 선크림", category: "출산/육아", stars: 4.5, score: 77.3, searchVolume: 62400, clicks: 7200, ctr: 2.8, isShopping: true, contentScore: 78, purchaseScore: 75, demandScore: 72, trendScore: 82, audienceScore: 80, trendTag: "시즌" },
    { id: "b3", keyword: "이유식 마스터기", category: "출산/육아", stars: 4.5, score: 72.1, searchVolume: 51800, clicks: 5900, ctr: 2.5, isShopping: true, contentScore: 72, purchaseScore: 70, demandScore: 70, trendScore: 68, audienceScore: 78 },
    { id: "b4", keyword: "아기 수면조끼", category: "출산/육아", stars: 4, score: 65.4, searchVolume: 35600, clicks: 4100, ctr: 2.2, isShopping: true, contentScore: 65, purchaseScore: 62, demandScore: 60, trendScore: 72, audienceScore: 70, trendTag: "시즌" },
    { id: "b5", keyword: "유아 식판 실리콘", category: "출산/육아", stars: 4, score: 60.8, searchVolume: 29400, clicks: 3400, ctr: 2.0, isShopping: true, contentScore: 62, purchaseScore: 58, demandScore: 55, trendScore: 65, audienceScore: 68 },
  ],
  "스포츠/레저": [
    { id: "s1", keyword: "폼롤러 마사지", category: "스포츠/레저", stars: 5, score: 79.6, searchVolume: 72100, clicks: 8300, ctr: 2.9, isShopping: true, contentScore: 80, purchaseScore: 78, demandScore: 75, trendScore: 82, audienceScore: 85, trendTag: "급상승" },
    { id: "s2", keyword: "등산 스틱 접이식", category: "스포츠/레저", stars: 4.5, score: 73.4, searchVolume: 55600, clicks: 6400, ctr: 2.6, isShopping: true, contentScore: 72, purchaseScore: 72, demandScore: 70, trendScore: 75, audienceScore: 78, trendTag: "시즌" },
    { id: "s3", keyword: "요가매트 두꺼운", category: "스포츠/레저", stars: 4.5, score: 69.8, searchVolume: 48200, clicks: 5500, ctr: 2.4, isShopping: true, contentScore: 70, purchaseScore: 68, demandScore: 65, trendScore: 72, audienceScore: 75 },
    { id: "s4", keyword: "헬스장갑 리프팅", category: "스포츠/레저", stars: 4, score: 63.5, searchVolume: 34800, clicks: 4000, ctr: 2.1, isShopping: true, contentScore: 65, purchaseScore: 62, demandScore: 58, trendScore: 68, audienceScore: 70 },
    { id: "s5", keyword: "런닝화 쿠션", category: "스포츠/레저", stars: 4, score: 59.2, searchVolume: 92500, clicks: 10800, ctr: 2.0, isShopping: true, contentScore: 58, purchaseScore: 55, demandScore: 65, trendScore: 55, audienceScore: 62 },
  ],
  "반려동물": [
    { id: "p1", keyword: "강아지 간식 수제", category: "반려동물", stars: 5, score: 83.2, searchVolume: 78400, clicks: 9000, ctr: 3.1, isShopping: true, contentScore: 85, purchaseScore: 82, demandScore: 80, trendScore: 85, audienceScore: 88, trendTag: "급상승" },
    { id: "p2", keyword: "고양이 자동급식기", category: "반려동물", stars: 4.5, score: 76.5, searchVolume: 61200, clicks: 7100, ctr: 2.7, isShopping: true, contentScore: 78, purchaseScore: 75, demandScore: 72, trendScore: 78, audienceScore: 80 },
    { id: "p3", keyword: "반려견 치석제거", category: "반려동물", stars: 4.5, score: 70.3, searchVolume: 42800, clicks: 4900, ctr: 2.4, isShopping: true, contentScore: 72, purchaseScore: 68, demandScore: 65, trendScore: 72, audienceScore: 75 },
    { id: "p4", keyword: "고양이 스크래처", category: "반려동물", stars: 4, score: 64.7, searchVolume: 38500, clicks: 4400, ctr: 2.2, isShopping: true, contentScore: 65, purchaseScore: 62, demandScore: 60, trendScore: 68, audienceScore: 72 },
    { id: "p5", keyword: "강아지 하네스 산책", category: "반려동물", stars: 4, score: 58.9, searchVolume: 31200, clicks: 3600, ctr: 1.9, isShopping: true, contentScore: 60, purchaseScore: 55, demandScore: 52, trendScore: 62, audienceScore: 65 },
  ],
  "가구/인테리어": [
    { id: "i1", keyword: "LED 간접조명", category: "가구/인테리어", stars: 5, score: 80.8, searchVolume: 85600, clicks: 9800, ctr: 3.0, isShopping: true, contentScore: 82, purchaseScore: 80, demandScore: 78, trendScore: 82, audienceScore: 85, trendTag: "급상승" },
    { id: "i2", keyword: "수납 선반 철제", category: "가구/인테리어", stars: 4.5, score: 74.1, searchVolume: 58900, clicks: 6800, ctr: 2.6, isShopping: true, contentScore: 75, purchaseScore: 72, demandScore: 72, trendScore: 70, audienceScore: 78 },
    { id: "i3", keyword: "커튼 암막 방한", category: "가구/인테리어", stars: 4.5, score: 68.5, searchVolume: 72300, clicks: 8200, ctr: 2.4, isShopping: true, contentScore: 70, purchaseScore: 65, demandScore: 72, trendScore: 65, audienceScore: 72, trendTag: "시즌" },
    { id: "i4", keyword: "메모리폼 베개", category: "가구/인테리어", stars: 4, score: 63.9, searchVolume: 45100, clicks: 5200, ctr: 2.2, isShopping: true, contentScore: 65, purchaseScore: 62, demandScore: 60, trendScore: 68, audienceScore: 70 },
    { id: "i5", keyword: "디퓨저 고급향", category: "가구/인테리어", stars: 4, score: 59.5, searchVolume: 52800, clicks: 6100, ctr: 2.0, isShopping: true, contentScore: 58, purchaseScore: 58, demandScore: 62, trendScore: 55, audienceScore: 65 },
  ],
};

const CATEGORY_EMOJI: Record<string, string> = {
  "건강식품": "💊", "생활/건강": "🏠", "화장품/미용": "💄", "식품": "🍎",
  "패션의류": "👗", "디지털/가전": "📱", "출산/육아": "👶",
  "스포츠/레저": "⚽", "반려동물": "🐾", "가구/인테리어": "🛋️",
};

const WEIGHT_INFO = [
  { label: "콘텐츠 매칭", weight: 25, desc: "콘텐츠 키워드 × 상품" },
  { label: "구매의향", weight: 20, desc: "구매 시그널 분석" },
  { label: "검색수요", weight: 20, desc: "검색량 + 쇼핑성" },
  { label: "트렌드", weight: 15, desc: "아이보스 + 시즌" },
  { label: "연령매칭", weight: 20, desc: "데이터랩 인기검색어" },
];

// ─── 유틸 ───
function starsDisplay(stars: number) {
  const full = Math.floor(stars);
  const half = stars % 1 >= 0.5;
  return "★".repeat(full) + (half ? "☆" : "");
}
function starColor(stars: number) {
  if (stars >= 4.5) return "text-[#C41E1E]";
  if (stars >= 3.5) return "text-yellow-500";
  return "text-gray-400";
}
function formatVolume(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "만";
  return n.toLocaleString("ko-KR");
}
function trendTagStyle(tag?: string) {
  if (tag === "급상승") return "bg-[#fff0f0] text-[#C41E1E]";
  if (tag === "시즌") return "bg-blue-50 text-blue-600";
  return "bg-gray-100 text-gray-500";
}
function scoreBarColor(score: number) {
  if (score >= 70) return "bg-[#C41E1E]";
  if (score >= 40) return "bg-yellow-400";
  return "bg-gray-300";
}
function classifyTier(followers: number): string {
  if (followers >= 1000000) return "메가";
  if (followers >= 100000) return "매크로";
  if (followers >= 10000) return "마이크로";
  if (followers >= 1000) return "나노";
  return "신규";
}
function buildCoreDemo(ages: { label: string; pct: number }[], femalePct: number): string {
  const sorted = [...ages].sort((a, b) => b.pct - a.pct);
  const top2 = sorted.slice(0, 2).map(a => a.label).join("~");
  const genderLabel = femalePct >= 60 ? "여성 중심" : femalePct <= 40 ? "남성 중심" : "균형";
  const topPct = sorted.slice(0, 2).reduce((s, a) => s + a.pct, 0);
  return `${top2} ${genderLabel} (${topPct}%)`;
}

// ═══════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════
export default function ProductRecommend() {
  const [persona, setPersona] = useState<ChannelPersona | null>(null);
  const [input, setInput] = useState<ChannelInput>(DEFAULT_INPUT);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 추천 결과 상태
  const [activeCategory, setActiveCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [showWeights, setShowWeights] = useState(false);
  const [showPersona, setShowPersona] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const currentPlatform = PLATFORMS.find(p => p.key === input.platform)!;

  // ── 핸들러 ──
  const updateInput = (patch: Partial<ChannelInput>) => setInput(prev => ({ ...prev, ...patch }));

  const togglePreferCategory = (cat: string) => {
    setInput(prev => ({
      ...prev,
      preferCategories: prev.preferCategories.includes(cat)
        ? prev.preferCategories.filter(c => c !== cat)
        : [...prev.preferCategories, cat],
    }));
  };

  const handleSubmit = () => {
    if (!input.name || !input.followers) return;

    setIsAnalyzing(true);
    // 실제로는 API 호출 → GPT 페르소나 생성
    setTimeout(() => {
      const followerNum = parseInt(input.followers.replace(/,/g, "")) || 0;
      const femalePct = parseInt(input.genderFemale) || 50;
      const ages = Object.entries(input.ages)
        .map(([label, val]) => ({ label, pct: parseFloat(val) || 0 }))
        .filter(a => a.pct > 0);

      // 연령 입력 없으면 플랫폼별 기본 추정
      const finalAges = ages.length > 0 ? ages : getDefaultAges(input.platform);

      const interestsList = input.interests
        ? input.interests.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const recCats = input.preferCategories.length > 0
        ? input.preferCategories
        : ["건강식품", "생활/건강"];

      const generated: ChannelPersona = {
        platform: input.platform,
        channelName: input.name,
        subscribers: followerNum,
        tier: classifyTier(followerNum),
        category: input.category || "기타",
        contentStyle: input.bio || `${input.category} 콘텐츠`,
        audience: {
          age: finalAges,
          gender: { female: femalePct, male: 100 - femalePct },
          coreDemo: buildCoreDemo(finalAges, femalePct),
          interests: interestsList.length > 0 ? interestsList : [input.category || "기타"],
          painPoints: ["상품 선택 어려움", "가성비 비교", "신뢰할 수 있는 리뷰"],
          purchaseSignals: getPurchaseSignals(input.platform),
        },
        recommendedCategories: recCats,
        channelStrengths: ["콘텐츠 전문성", "시청자 신뢰도"],
        collabFit: `${input.category} 카테고리 상품 협업 시 높은 전환율 기대`,
      };

      setPersona(generated);
      setActiveCategory(recCats[0]);
      setIsAnalyzing(false);
      setIsEditing(false);
    }, 1500);
  };

  const handleEdit = () => {
    setIsEditing(true);
    // persona → input 역변환
    if (persona) {
      setInput({
        ...DEFAULT_INPUT,
        platform: persona.platform,
        name: persona.channelName,
        followers: persona.subscribers.toString(),
        category: persona.category,
        bio: persona.contentStyle,
        ages: Object.fromEntries(
          persona.audience.age.map(a => [a.label, a.pct.toString()])
        ),
        genderFemale: persona.audience.gender.female.toString(),
        interests: persona.audience.interests.join(", "),
        preferCategories: persona.recommendedCategories,
      });
    }
    setPersona(null);
  };

  const handlePick = (id: string) => {
    setPickedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ═══ 채널 미등록 → 입력 폼 ═══
  if (!persona && !isEditing || isEditing) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">상품 추천</h2>
          <p className="mt-1 text-sm text-gray-500">
            채널 정보를 입력하면 맞춤 상품을 추천해드립니다
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
              {/* 플랫폼 선택 */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">플랫폼</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(p => (
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

              {/* 채널 URL */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">채널 URL</label>
                <input
                  type="text"
                  value={input.url}
                  onChange={e => updateInput({ url: e.target.value })}
                  placeholder={currentPlatform.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>

              {/* 채널명 + 팔로워 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    채널명 <span className="text-[#C41E1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={input.name}
                    onChange={e => updateInput({ name: e.target.value })}
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
                    onChange={e => updateInput({ followers: e.target.value })}
                    placeholder="예: 52000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                  />
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">주요 카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
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

              {/* 한줄 소개 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">채널 소개</label>
                <input
                  type="text"
                  value={input.bio}
                  onChange={e => updateInput({ bio: e.target.value })}
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
                      const patch: Partial<ChannelInput> = { ages: { ...input.ages, ...result.ages } };
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
                        // YouTube Studio CSV 파싱: 연령, 성별 등 추출
                        const ageMap: AgeData = {};
                        let femaleStr = "";
                        for (const line of lines) {
                          const cols = line.split(/[,\t]/);
                          // "Age group" 또는 "연령" 컬럼 감지
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
                        const patch: Partial<ChannelInput> = {};
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
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                  시청자 연령 분포 (%)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {(input.platform === "tiktok" ? [...AGE_RANGES_TT] : [...AGE_RANGES_YT_IG]).map(range => (
                    <div key={range}>
                      <p className="mb-1 text-center text-[11px] text-gray-500">{range}</p>
                      <input
                        type="number"
                        min="0" max="100"
                        step="0.1"
                        value={input.ages[range] || ""}
                        onChange={e => updateInput({ ages: { ...input.ages, [range]: e.target.value } })}
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
                    onChange={e => updateInput({ genderFemale: e.target.value })}
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
                  onChange={e => updateInput({ interests: e.target.value })}
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
                  onChange={e => updateInput({ topRegion: e.target.value })}
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
                  {PLATFORM_COMMERCE[input.platform].options.map(opt => (
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
                  {PRODUCT_CATEGORIES.map(cat => (
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
                  <span className="font-medium text-gray-900">{input.followers ? parseInt(input.followers.replace(/,/g, "")).toLocaleString("ko-KR") + "명" : "—"}</span>
                  <span className="text-gray-500">카테고리</span>
                  <span className="font-medium text-gray-900">{input.category || "—"}</span>
                  <span className="text-gray-500">관심사</span>
                  <span className="font-medium text-gray-900">{input.interests || "—"}</span>
                  <span className="text-gray-500">추천 카테고리</span>
                  <span className="font-medium text-gray-900">{input.preferCategories.join(", ") || "자동 선정"}</span>
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
                  {isAnalyzing ? "분석 중..." : "페르소나 생성 + 상품 추천"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══ 채널 등록 완료 → 추천 결과 ═══
  const products = DUMMY_RECOMMENDATIONS[activeCategory] || [];
  const platformLabel = PLATFORMS.find(p => p.key === persona!.platform)?.label || "";
  const platformIcon = PLATFORMS.find(p => p.key === persona!.platform)?.icon || "";

  // 판매 실적 기반 인사이트 (DB 연동 시 실데이터로 교체)
  const salesInsights = {
    topCategory: "건강식품",
    totalOrders: 312,
    totalRevenue: 18400000,
    avgOrderValue: 58974,
    bestSeller: "프리미엄 비타민C 5000mg",
    repeatRate: 34,
  };

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">상품 추천</h2>
          <p className="mt-1 text-sm text-gray-500">
            채널 페르소나 기반 맞춤 추천 결과
          </p>
        </div>
        <button
          onClick={handleEdit}
          className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          채널 정보 수정
        </button>
      </div>

      {/* ── 판매 데이터 인사이트 ── */}
      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📈</span>
          <h3 className="text-sm font-bold text-gray-900">내 판매 데이터 기반 인사이트</h3>
          <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            실적 반영
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-[10px] text-gray-500">최다 판매 카테고리</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{salesInsights.topCategory}</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-[10px] text-gray-500">총 주문</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{salesInsights.totalOrders}건</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-[10px] text-gray-500">총 매출</p>
            <p className="mt-1 text-sm font-bold text-[#C41E1E]">{(salesInsights.totalRevenue / 10000).toFixed(0)}만원</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-[10px] text-gray-500">재구매율</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{salesInsights.repeatRate}%</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-blue-600">
          💡 베스트셀러: {salesInsights.bestSeller} · 평균 객단가 {salesInsights.avgOrderValue.toLocaleString()}원 → 유사 가격대 상품이 추천에 반영됩니다
        </p>
      </div>

      {/* ── 채널 페르소나 요약 카드 ── */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#C41E1E] text-lg font-bold text-white">
              {persona!.channelName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{persona!.channelName}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  {platformIcon} {platformLabel}
                </span>
                <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-medium text-white">
                  {persona!.tier}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {persona!.platform === "youtube" ? "구독자" : "팔로워"}{" "}
                {persona!.subscribers.toLocaleString("ko-KR")}명 · {persona!.category}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{persona!.contentStyle}</p>
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4 sm:ml-auto">
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-gray-400">핵심 시청자</p>
              <p className="mt-0.5 text-xs font-semibold text-gray-900">{persona!.audience.coreDemo}</p>
            </div>
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-gray-400">추천 카테고리</p>
              <p className="mt-0.5 text-xs font-semibold text-gray-900">{persona!.recommendedCategories.length}개</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowPersona(!showPersona)}
          className="mt-3 cursor-pointer text-xs text-gray-500 hover:text-gray-700"
        >
          {showPersona ? "페르소나 접기 ↑" : "페르소나 상세 보기 ↓"}
        </button>

        {showPersona && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700">시청자 연령 분포</p>
              <div className="space-y-1.5">
                {persona!.audience.age.map(a => (
                  <div key={a.label} className="flex items-center gap-2">
                    <span className="w-10 text-[11px] text-gray-500">{a.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-[#C41E1E] rounded-full" style={{ width: `${a.pct * 2}%`, maxWidth: "100%" }} />
                    </div>
                    <span className="w-8 text-right text-[11px] font-medium text-gray-700">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700">관심사</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {persona!.audience.interests.map(kw => (
                  <span key={kw} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">{kw}</span>
                ))}
              </div>
              <p className="mb-2 text-xs font-semibold text-gray-700">구매 시그널</p>
              <div className="flex flex-wrap gap-1.5">
                {persona!.audience.purchaseSignals.map(s => (
                  <span key={s} className="rounded-full bg-[#fff0f0] px-2.5 py-1 text-[11px] text-[#C41E1E]">
                    &ldquo;{s}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 카테고리 탭 ── */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {persona!.recommendedCategories.map(cat => {
          const count = (DUMMY_RECOMMENDATIONS[cat] || []).length;
          const emoji = CATEGORY_EMOJI[cat] || "📦";
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setExpandedId(null); }}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {emoji} {cat} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setShowWeights(!showWeights)}
          className="ml-auto cursor-pointer rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-500 hover:bg-gray-50"
        >
          점수 기준 {showWeights ? "↑" : "↓"}
        </button>
      </div>

      {showWeights && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">추천 점수 산출 기준</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {WEIGHT_INFO.map(w => (
              <div key={w.label} className="rounded bg-white border border-gray-100 p-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-[#C41E1E]">{w.weight}%</span>
                  <span className="text-[11px] font-medium text-gray-700">{w.label}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-gray-400">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 추천 상품 리스트 ── */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm font-medium text-gray-900">이 카테고리에 추천 상품이 없습니다</p>
          <p className="mt-1 text-xs text-gray-500">데이터 수집 후 추천이 생성됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p, idx) => {
            const isExpanded = expandedId === p.id;
            const isPicked = pickedIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isPicked ? "border-[#C41E1E] bg-[#fffbfb]" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${starColor(p.stars)}`}>{starsDisplay(p.stars)}</span>
                      <span className="text-xs font-medium text-gray-700">{p.score}점</span>
                      {p.trendTag && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${trendTagStyle(p.trendTag)}`}>
                          {p.trendTag}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-gray-900">{p.keyword}</h4>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>검색량 <span className="font-medium text-gray-900">{formatVolume(p.searchVolume)}</span>/월</span>
                      <span>클릭 <span className="font-medium text-gray-900">{formatVolume(p.clicks)}</span></span>
                      <span>CTR <span className="font-medium text-gray-900">{p.ctr}%</span></span>
                      {p.isShopping && (
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">쇼핑성</span>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-semibold text-gray-700">세부 점수</p>
                        <div className="space-y-2">
                          {[
                            { label: "콘텐츠 매칭", value: p.contentScore },
                            { label: "구매의향", value: p.purchaseScore },
                            { label: "검색수요", value: p.demandScore },
                            { label: "트렌드", value: p.trendScore },
                            { label: "연령매칭", value: p.audienceScore },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-2">
                              <span className="w-16 text-[11px] text-gray-500">{s.label}</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                <div className={`h-full rounded-full ${scoreBarColor(s.value)}`} style={{ width: `${s.value}%` }} />
                              </div>
                              <span className="w-8 text-right text-[11px] font-medium text-gray-700">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => handlePick(p.id)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isPicked ? "bg-gray-200 text-gray-600" : "bg-[#C41E1E] text-white hover:bg-[#A01818]"
                      }`}
                    >
                      {isPicked ? "담김" : "PICK"}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      {isExpanded ? "접기" : "상세"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pickedIds.size > 0 && (
        <div className="mt-5 flex items-center justify-between rounded-xl bg-[#111111] px-5 py-4">
          <p className="text-sm font-medium text-white">
            <span className="text-[#C41E1E] font-bold">{pickedIds.size}개</span> 상품을 PICK 했습니다
          </p>
          <button className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2 text-sm font-medium text-white hover:bg-[#A01818]">
            내 PICK에 추가
          </button>
        </div>
      )}
    </div>
  );
}

// ── 플랫폼별 기본 연령 추정 ──
function getDefaultAges(platform: Platform): { label: string; pct: number }[] {
  switch (platform) {
    case "youtube":
      return [
        { label: "10대", pct: 5 }, { label: "20대", pct: 15 },
        { label: "30대", pct: 30 }, { label: "40대", pct: 30 },
        { label: "50대", pct: 15 }, { label: "60대+", pct: 5 },
      ];
    case "instagram":
      return [
        { label: "10대", pct: 8 }, { label: "20대", pct: 35 },
        { label: "30대", pct: 32 }, { label: "40대", pct: 18 },
        { label: "50대", pct: 5 }, { label: "60대+", pct: 2 },
      ];
    case "tiktok":
      return [
        { label: "10대", pct: 25 }, { label: "20대", pct: 38 },
        { label: "30대", pct: 22 }, { label: "40대", pct: 10 },
        { label: "50대", pct: 4 }, { label: "60대+", pct: 1 },
      ];
  }
}

// ── 플랫폼별 기본 구매 시그널 ──
function getPurchaseSignals(platform: Platform): string[] {
  switch (platform) {
    case "youtube":
      return ["어디서 사요?", "링크 주세요", "가격 알려주세요"];
    case "instagram":
      return ["공구 언제 열어요?", "링크인바이오", "DM 드려도 될까요?"];
    case "tiktok":
      return ["링크인바이오", "어디서 사요?", "Shop에서 찾으면 되나요?"];
  }
}
