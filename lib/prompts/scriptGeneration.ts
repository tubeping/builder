export type ScriptFormat = "longform" | "shorts" | "post";

// ── 카피 분류 시스템 ──
// enum은 영어 코드로 (Gemini 토큰 경계에서 한국어 깨짐 회피)
// 사용자 표시는 MAIN_CATEGORY_LABEL_KO / PSYCH_TAG_LABEL_KO 로 한국어 매핑
export type MainCategory =
  | "problem_solving"     // 문제해결형 — PAS · negative hook · 기능성
  | "authority"           // 권위전문형 — Authority · 의료·전문
  | "story_empathy"       // 공감스토리형 — Storytelling · 식품·라이프
  | "transformation"      // 변화체험형 — BAB · 뷰티·다이어트
  | "comparison_proof"    // 비교증명형 — FAB · 가전·리빙
  | "urgency_focused"     // 시한촉박형 — Urgency · scarcity · CTA
  | "meme_visual";        // 밈시각형 — visual_meme · 숏폼·트렌드

export const MAIN_CATEGORY_LIST: MainCategory[] = [
  "problem_solving",
  "authority",
  "story_empathy",
  "transformation",
  "comparison_proof",
  "urgency_focused",
  "meme_visual",
];

export const MAIN_CATEGORY_LABEL_KO: Record<MainCategory, string> = {
  problem_solving: "문제해결형",
  authority: "권위전문형",
  story_empathy: "공감스토리형",
  transformation: "변화체험형",
  comparison_proof: "비교증명형",
  urgency_focused: "시한촉박형",
  meme_visual: "밈시각형",
};

export type PsychTag =
  | "authority_psych"   // 권위
  | "social_proof"      // 사회증거
  | "scarcity"          // 희소성
  | "loss_aversion"     // 손실회피
  | "reciprocity"       // 호혜
  | "anchoring"         // 앵커링
  | "similarity"        // 유사성
  | "urgency_psych";    // 긴급성

export const PSYCH_TAG_LIST: PsychTag[] = [
  "authority_psych",
  "social_proof",
  "scarcity",
  "loss_aversion",
  "reciprocity",
  "anchoring",
  "similarity",
  "urgency_psych",
];

export const PSYCH_TAG_LABEL_KO: Record<PsychTag, string> = {
  authority_psych: "권위",
  social_proof: "사회증거",
  scarcity: "희소성",
  loss_aversion: "손실회피",
  reciprocity: "호혜",
  anchoring: "앵커링",
  similarity: "유사성",
  urgency_psych: "긴급성",
};

export interface ScriptCategories {
  main: MainCategory;
  tags: PsychTag[];   // 최대 2개
}

export const MAIN_CATEGORY_BADGE: Record<MainCategory, string> = {
  problem_solving: "bg-blue-100 text-blue-700",
  authority: "bg-indigo-100 text-indigo-700",
  story_empathy: "bg-pink-100 text-pink-700",
  transformation: "bg-emerald-100 text-emerald-700",
  comparison_proof: "bg-amber-100 text-amber-700",
  urgency_focused: "bg-red-100 text-red-700",
  meme_visual: "bg-purple-100 text-purple-700",
};

export interface ProductInput {
  productName: string;
  originalPrice: number;
  gongguPrice: number;
  gongguStart?: string;
  gongguEnd?: string;
}

export interface GenerationContext {
  experience: string;
  target?: string;
  tone?: string;
  referenceUrl?: string;
  referenceReelExample?: string; // 분석된 릴스를 few-shot으로 주입 (reelToFewShotExample 결과)
  fewShotCaptions?: string;       // 인스타 공구 캡션 풀에서 동적 주입
  preferredMain?: MainCategory;   // 사용자가 선택한 메인 카테고리 (없으면 모델 자동 분류)
}

export interface BaseOutput {
  // Gemini API 응답에서만 보장. 로컬 폴백(scriptTemplates)에서는 부재 가능.
  categories?: ScriptCategories;
}

export interface LongformOutput extends BaseOutput {
  hook: string;
  intro: string;
  benefits: string;
  dealInfo: string;
  cta: string;
}

export interface ShortsOutput extends BaseOutput {
  hook: string;
  core: string;
  cta: string;
}

export interface PostOutput extends BaseOutput {
  opening: string;
  body: string;
  hashtags: string;
  cta: string;
}

export type ScriptOutput = LongformOutput | ShortsOutput | PostOutput;

const SHARED_KNOWLEDGE = `# 한국 공구 대본 작성 원칙 (TubePing G-FRAME)

## 훅 6유형 (첫 3초 승부)
1. 호기심형 — "10년 차 피부과 원장이 추천하는..."
2. 스토리텔링형 — "저도 같은 고민을 5년간 했거든요"
3. 챌린지형 — "한 달 써본 솔직한 후기"
4. 부정/손실형 — "이거 잘못 고르면 피부 10년 늙어요"
5. 비교형 — "A vs B 직접 비교해봤어요"
6. 비주얼/밈형 — 시각적 반전·상황 제시

## 본론 구조 — 제품군별 프레임워크
- 뷰티 기능성: PAS (Problem → Agitate → Solution) + BAB (Before → After → Bridge)
- 건강식품: PASTOR (Problem·Amplify·Solution·Transformation·Offer·Response)
- 가전/리빙: FAB (Feature → Advantage → Benefit) + 4P's
- 식품: 스토리텔링 (개인 경험 중심)
- 육아: QUEST (타겟 명확화 + 권위)

## CTA 5패턴 (홈쇼핑 50년 노하우)
- 긴급성: "오늘 자정 마감"
- 한정성: "재고 ○○개 남음"
- 인기도: "지난 공구 2시간 완판"
- 압박: "댓글 문의 폭주 중"
- 증정: "오늘만 샘플 추가 증정"

## 판매 심리 10원칙 활용
- 앵커링: 정가→공구가 대비 반드시 표시 (숫자로)
- 손실회피: "놓치면 손해" 프레이밍 (뷰티·건강)
- 사회적증거: 후기·댓글 인용
- 유사성: "저도 같은 고민" 공감
- 희소성: 기간·수량 명시
- 호혜: 정보·샘플 먼저 제공 언급
- 권위: 전문 자격·경력 언급
- 칵테일파티: "○○으로 고민인 분"

## 작성 규칙
- 구체 숫자 필수 (모호한 "많은 사람" 금지, "3만 개 판매" 같은 수치)
- 전문용어 대신 일상 언어
- 한 문장에 하나의 메시지
- "나도 써봤다"는 실제 체험 서술 (크리에이터가 입력한 experience 활용)
- 과장·허위 금지 ("100% 효과", "완전히 치료" 등 단정 금지)
- "내돈내산" 표현 금지 (광고·협찬인 경우)

## 금지 사항 (윤리 가드레일)
- 의료·의학 효능 단정 ("치료된다" X)
- 경쟁사 비방
- "100% 안전/완치" 등 절대 주장
- 개인정보·사생활 노출 유도

## 출력 언어
한국어. 크리에이터가 자연스럽게 말할 수 있는 구어체.
AI가 쓴 티 나지 않도록 — "입니다/합니다" 반복 회피, 문장 길이 리듬 조절.

---

## 📛 카피 분류 라벨 (출력 시 반드시 1개 선택)

대본 작성 후 사용한 카피라이팅 패턴을 다음 7개 enum 중 **1개**로 분류해서 categories.main 필드에 기재.
값은 **반드시 영어 enum 그대로**(괄호 안 한국어 설명은 참고용).

| enum | 한국어 | 매커니즘 | 어울리는 상품 |
|---|---|---|---|
| problem_solving | 문제해결형 | PAS · negative hook | 다이어트·건강·청결 |
| authority | 권위전문형 | 전문 자격·임상 강조 | 의료·전문 도구·교육 |
| story_empathy | 공감스토리형 | "저도 그랬어요" 개인 경험 | 식품·라이프·반려동물 |
| transformation | 변화체험형 | Before/After 시각 변화 | 뷰티·다이어트·인테리어 |
| comparison_proof | 비교증명형 | A vs B 비교·기능 우위 | 가전·리빙·기능성 |
| urgency_focused | 시한촉박형 | 한정·긴급·완판 CTA 강함 | 모든 카테고리 |
| meme_visual | 밈시각형 | 강한 시각 훅·트렌드 밈 | 숏폼·재미 |

## 🏷️ 보조 심리 태그 (출력 시 0~2개 선택)

실제 본론에 활용한 심리 원칙을 다음 영어 enum 중 0~2개 골라 categories.tags 필드에 기재.

| enum | 한국어 |
|---|---|
| authority_psych | 권위 |
| social_proof | 사회증거 |
| scarcity | 희소성 |
| loss_aversion | 손실회피 |
| reciprocity | 호혜 |
| anchoring | 앵커링 |
| similarity | 유사성 |
| urgency_psych | 긴급성 |

(예: { "main": "transformation", "tags": ["loss_aversion", "social_proof"] })

---

## 🚨 최종 메타 규칙 (가장 중요)

이 시스템 프롬프트의 모든 예시(향수·다이어트·뷰티·가전 등 specific 상품 언급)는
**카피라이팅 패턴을 설명하기 위한 참고용**일 뿐입니다.

실제 대본 작성은 **반드시 user message에 주어진 상품·체험만 가지고** 합니다.
- user message의 상품이 "태국 망고"라면 → 망고 대본
- user message의 상품이 "공기청정기"라면 → 공기청정기 대본
- 위 예시에 나오는 향수·다이어트 젤리·가방 같은 단어를 절대로 user 상품 자리에 끼워넣지 마세요.

특히 모호한 숫자(예: "5kg")가 user 입력에 있으면, 그것은 **user가 명시한 맥락**(박스 무게·용량 등)이지
시스템 예시의 다이어트 5kg 감량 등으로 해석하지 마세요.
`;

const LONGFORM_SYSTEM = `${SHARED_KNOWLEDGE}

## 이번 작업: 유튜브 롱폼 상품 리뷰 대본 (3~8분)

### 구조 (G-FRAME 롱폼)
1. hook — 20초 이내 시청자 붙잡는 첫 구간 (6유형 중 제품군에 맞는 유형 선택)
2. intro — 크리에이터의 공감 + 왜 이 제품을 리뷰하게 됐는지 스토리 (1~2분)
3. benefits — 실사용 경험 기반 장점 3가지 + Before/After (가장 긴 구간)
4. dealInfo — 공구 조건 (정가·공구가·할인율·기간·수량·증정) 구체 숫자 포함
5. cta — 링크 안내 + 마감 강조 (홈쇼핑 5패턴 중 택1)

### 분량 가이드
- hook: 80~150자
- intro: 200~350자
- benefits: 400~700자 (장점별 구분)
- dealInfo: 150~300자
- cta: 80~150자
- 전체 합계: 900~1700자

### 스타일
- 크리에이터가 카메라 보고 말하는 구어체
- "~거든요", "~더라고요" 등 자연스러운 말끝 혼합
- 과한 감탄사·"여러분!" 남발 금지
`;

const SHORTS_SYSTEM = `${SHARED_KNOWLEDGE}

## 이번 작업: 유튜브 쇼츠/릴스 대본 (15~60초)

### 구조 (G-FRAME 숏폼 압축)
1. hook — 첫 1~3초, **7단어 이하**, 6유형 중 가장 임팩트 강한 유형
2. core — 10~30초, 제품 핵심 장점 1~2개 + 공구 조건 핵심 (앵커링 포함)
3. cta — 2~5초, **시한성 필수** ("오늘 자정", "내일까지" 등 구체 기한)

### 분량 가이드
- hook: 15자 이내 (말로 1~3초)
- core: 80~200자 (말로 10~30초)
- cta: 20~40자 (말로 2~5초)
- 전체 합계: 130~250자

### 규칙
- **전체가 훅이다** — 그라데이션 없음, 즉시 본론
- 장황한 인사/소개 금지
- "안녕하세요 여러분" 같은 오프닝 절대 금지
- 숫자·구체 수치 필수 (할인율·가격)
- 마지막은 반드시 행동 유도 문구 (프로필 링크/댓글 등)
`;

const POST_SYSTEM = `${SHARED_KNOWLEDGE}

## 이번 작업: 인스타그램 피드/블로그 공구 게시글

### 구조
1. opening — 시선 잡는 1~2줄 (호기심 or 공감형 훅). 줄바꿈 활용.
2. body — 제품 소개 + 실사용 후기 + 장점 2~3개 + 공구 조건.
   - 짧은 문단으로 나누기 (3~5줄씩)
   - 이모지 최소한 활용 가능 (1~3개)
   - 구체 숫자·가격 반드시 포함
3. hashtags — 관련 해시태그 8~15개 (공백 구분, # 포함)
   - 브랜드명·카테고리·타겟층·트렌드 해시태그 혼합
4. cta — 구매 유도 문구 + 링크 안내 (프로필 링크 / 댓글 DM 등)

### 분량 가이드
- opening: 30~80자 (2~3줄)
- body: 400~700자 (여러 문단)
- hashtags: 8~15개
- cta: 40~100자

### 스타일
- 친근한 반말/존댓말 혼합 (크리에이터 톤에 맞춤)
- 저장·공유 유도 멘트 포함 ("저장해두세요", "친구한테 공유해요")
- 과장 광고 느낌 금지 — 일상 공유 톤
`;

// 공통 — 분류 라벨 필드
const CATEGORIES_SCHEMA = {
  type: "object",
  properties: {
    main: {
      type: "string",
      enum: MAIN_CATEGORY_LIST as unknown as string[],
      description:
        "이 대본이 가장 가까운 카피 분류 1개 (문제해결형·권위전문형·공감스토리형·변화체험형·비교증명형·시한촉박형·밈시각형)",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        enum: PSYCH_TAG_LIST as unknown as string[],
      },
      maxItems: 2,
      description: "본론에 실제 적용한 심리 원칙 0~2개 (권위·사회증거·희소성·손실회피·호혜·앵커링·유사성·긴급성)",
    },
  },
  required: ["main", "tags"],
  additionalProperties: false,
} as const;

const LONGFORM_SCHEMA = {
  type: "object",
  properties: {
    hook: {
      type: "string",
      description: "첫 20초 훅. 시청자가 계속 보게 만드는 강한 오프닝.",
    },
    intro: {
      type: "string",
      description: "크리에이터의 공감과 이 제품을 리뷰하게 된 배경 스토리.",
    },
    benefits: {
      type: "string",
      description: "실사용 경험 기반 장점 3가지 + Before/After. 가장 긴 구간.",
    },
    dealInfo: {
      type: "string",
      description: "공구 조건 — 정가/공구가/할인율/기간/수량/증정 등 구체 숫자.",
    },
    cta: {
      type: "string",
      description: "링크 안내 + 마감 강조 등 행동 유도 문구.",
    },
    categories: CATEGORIES_SCHEMA,
  },
  required: ["hook", "intro", "benefits", "dealInfo", "cta", "categories"],
  additionalProperties: false,
} as const;

const SHORTS_SCHEMA = {
  type: "object",
  properties: {
    hook: {
      type: "string",
      description: "1~3초, 7단어 이하의 임팩트 강한 첫 문구.",
    },
    core: {
      type: "string",
      description: "10~30초 본론. 장점 1~2개 + 공구 조건 핵심.",
    },
    cta: {
      type: "string",
      description: "2~5초. 시한성 필수 CTA.",
    },
    categories: CATEGORIES_SCHEMA,
  },
  required: ["hook", "core", "cta", "categories"],
  additionalProperties: false,
} as const;

const POST_SCHEMA = {
  type: "object",
  properties: {
    opening: {
      type: "string",
      description: "시선 잡는 1~2줄 오프닝.",
    },
    body: {
      type: "string",
      description: "제품 소개 + 후기 + 장점 + 공구 조건. 여러 문단 구성.",
    },
    hashtags: {
      type: "string",
      description: "관련 해시태그 8~15개 공백 구분.",
    },
    cta: {
      type: "string",
      description: "구매 유도 + 링크 안내.",
    },
    categories: CATEGORIES_SCHEMA,
  },
  required: ["opening", "body", "hashtags", "cta", "categories"],
  additionalProperties: false,
} as const;

export const FORMAT_CONFIG = {
  longform: {
    systemPrompt: LONGFORM_SYSTEM,
    schema: LONGFORM_SCHEMA,
    label: "롱폼 리뷰",
    maxTokens: 4000,
  },
  shorts: {
    systemPrompt: SHORTS_SYSTEM,
    schema: SHORTS_SCHEMA,
    label: "숏폼",
    maxTokens: 1500,
  },
  post: {
    systemPrompt: POST_SYSTEM,
    schema: POST_SCHEMA,
    label: "게시글",
    maxTokens: 2500,
  },
} as const;

function formatPrice(n: number): string {
  if (!n || n <= 0) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

function discountRate(original: number, gonggu: number): number {
  if (!original || original <= 0 || !gonggu) return 0;
  return Math.round((1 - gonggu / original) * 100);
}

export function buildUserPrompt(
  product: ProductInput,
  context: GenerationContext,
  format: ScriptFormat
): string {
  const discount = discountRate(product.originalPrice, product.gongguPrice);
  const period =
    product.gongguStart && product.gongguEnd
      ? `${product.gongguStart} ~ ${product.gongguEnd}`
      : "미정 (대본에 '곧 공개' 식으로 처리)";

  const formatLabel = FORMAT_CONFIG[format].label;

  return `# 작업
이번 작업은 아래에 지정된 **단 하나의 상품**에 대한 **${formatLabel}** 대본 작성입니다.

⚠️ **절대 규칙** ⚠️
- 시스템 프롬프트에 나오는 예시(다이어트·뷰티·향수 등)는 단지 **카피라이팅 패턴**을 보여주는 것일 뿐입니다.
- 우리 상품과 카테고리가 다르더라도 **그 예시의 상품·맥락은 절대 차용하지 마세요**.
- 오직 아래 "상품 정보"와 "체험 포인트"의 내용만 가지고 작성합니다.
- 상품명이 "${product.productName}"이면 대본도 "${product.productName}" 이야기여야 합니다.

---

## 상품 정보
- 상품명: ${product.productName}
- 정가: ${formatPrice(product.originalPrice)}
- 공구가: ${formatPrice(product.gongguPrice)}
- 할인율: ${discount > 0 ? discount + "%" : "미정"}
- 공구 기간: ${period}

## 크리에이터가 입력한 공구 내용·체험 (이 내용을 반드시 대본에 반영)
${context.experience || "(미입력 — 위 상품명만으로 일반적인 사용 후기 서술)"}

## 타겟 시청자
${context.target || "미지정 (일반 대중 타겟으로 작성)"}

## 원하는 톤
${context.tone || "친근 (자연스러운 구어체)"}

${
  context.referenceUrl
    ? `## 말투 참조\n크리에이터가 평소 쓰는 말투: ${context.referenceUrl}\n`
    : ""
}
${
  context.referenceReelExample
    ? `## 레퍼런스 릴스 (이 톤·구조를 참고하되 그대로 베끼지 말 것)\n${context.referenceReelExample}\n\n위 릴스의 훅 유형·프레임·CTA 패턴만 참고하고, 상품·내용은 위에 지정된 "${product.productName}" 그대로 가야 합니다.\n`
    : ""
}
${
  context.fewShotCaptions
    ? `## 참고 — 실제 한국 인스타 공구 캡션 (이 톤·구조·줄바꿈·이모지 사용 패턴을 모방)
${context.fewShotCaptions}

위 캡션들은 좋아요 수가 높은 실제 공구 캡션입니다. 어휘 선택·문장 리듬·이모지 절제·줄바꿈을 모방하되, 상품·내용은 위에 지정된 "${product.productName}" 그대로 가야 합니다.\n`
    : ""
}
${
  context.preferredMain
    ? `## 🎯 사용자 지정 유형 (반드시 이 유형으로 작성)
**categories.main = "${context.preferredMain}"** 으로 고정합니다.
모델이 다른 유형으로 분류하면 안 됩니다. 이 유형의 매커니즘에 맞춰 hook·본론·CTA를 구성하세요.
- problem_solving (문제해결형): 문제→확대→해결. 부정/손실형 훅 ("이거 잘못 고르면...")
- authority (권위전문형): 전문 자격·경력·임상 강조 ("10년차 ○○ 추천")
- story_empathy (공감스토리형): "저도 그랬어요" 개인 경험 중심
- transformation (변화체험형): Before / After 시각 변화 강조
- comparison_proof (비교증명형): A vs B 비교·기능 우위
- urgency_focused (시한촉박형): 한정·긴급·완판이 본론보다 강함
- meme_visual (밈시각형): 강한 시각 훅·트렌드 밈

categories.tags 는 본론에 실제 사용한 심리 원칙 0~2개를 자유롭게 선택.\n`
    : ""
}

## 마무리 체크리스트
- [ ] hook에 위 상품명 또는 체험 포인트의 핵심이 들어갔는가?
- [ ] 본문에 위 체험·공구 조건이 그대로 반영됐는가? (AI가 지어낸 경험담 금지)
- [ ] 시스템 예시의 카테고리(다이어트·뷰티 등)로 빠지지 않았는가?
- [ ] 가격·기간 숫자는 입력한 그대로인가?
- [ ] categories.main (분류 라벨 1개) + categories.tags (심리 태그 0~2개)를 채웠는가?
`;
}
