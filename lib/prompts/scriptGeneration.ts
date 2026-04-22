export type ScriptFormat = "longform" | "shorts" | "post";

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
}

export interface LongformOutput {
  hook: string;
  intro: string;
  benefits: string;
  dealInfo: string;
  cta: string;
}

export interface ShortsOutput {
  hook: string;
  core: string;
  cta: string;
}

export interface PostOutput {
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
  },
  required: ["hook", "intro", "benefits", "dealInfo", "cta"],
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
  },
  required: ["hook", "core", "cta"],
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
  },
  required: ["opening", "body", "hashtags", "cta"],
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

  return `아래 공구 상품에 대한 **${formatLabel}** 대본을 작성해주세요.

## 상품 정보
- 상품명: ${product.productName}
- 정가: ${formatPrice(product.originalPrice)}
- 공구가: ${formatPrice(product.gongguPrice)}
- 할인율: ${discount > 0 ? discount + "%" : "미정"}
- 공구 기간: ${period}

## 크리에이터의 실제 체험 포인트 (반드시 대본에 자연스럽게 녹여주세요)
${context.experience || "(체험 포인트 미입력 — 일반적인 사용 후기로 서술)"}

## 타겟 시청자
${context.target || "미지정 (일반 대중 타겟으로 작성)"}

## 원하는 톤
${context.tone || "친근 (자연스러운 구어체)"}

${
  context.referenceUrl
    ? `## 말투 참조\n크리에이터가 평소 쓰는 말투: ${context.referenceUrl}\n`
    : ""
}

## 요청
- 위 체험 포인트를 반드시 본론에 녹여주세요 (AI가 지어낸 경험담 금지).
- 구체 숫자(가격·할인율·기간)는 상품 정보 그대로 사용해주세요.
- 지정된 JSON 스키마 형식으로만 답변해주세요.
- 각 필드 안에는 여러 문장을 자유롭게 담되, 필드 사이 구분은 스키마를 따라주세요.
`;
}
