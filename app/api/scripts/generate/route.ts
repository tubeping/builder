import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  FORMAT_CONFIG,
  buildUserPrompt,
  type ScriptFormat,
  type ProductInput,
  type GenerationContext,
  type ScriptOutput,
} from "@/lib/prompts/scriptGeneration";
import {
  reelToFewShotExample,
  type ReelAnalysisResult,
} from "@/lib/prompts/reelAnalysis";
import fewShotPoolJson from "@/lib/prompts/fewShotPool.json";

interface FewShotEntry {
  uiCategory: string;
  subcat: string;
  url: string;
  username: string;
  caption: string;
  likes: number;
  hashtag: string;
}

interface FewShotPool {
  generatedAt: string;
  sourceFile: string;
  totalSamples: number;
  perCategoryCap: number;
  pool: Record<string, FewShotEntry[]>;
}

const fewShotPool = fewShotPoolJson as FewShotPool;

// 입력 상품명·체험에서 카테고리 추정 — regex 대신 string array + includes
// (SWC/Next 빌드 transformer가 regex literal 내 한국어를 일부 케이스에서 손상시키는 이슈 회피)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ["망고", "딸기", "복숭아", "사과", "포도", "과일", "샤인머스캣", "수박", "참외", "멜론", "체리", "블루베리", "곡물", "간식", "디저트", "밀키트", "반찬", "김치", "올리브", "젓갈", "소스", "음료", "커피", "와인", "맥주", "치즈", "버터", "요거트", "육포", "육류", "고기", "돼지", "소고기", "생선", "해산물", "새우", "연어", "참치", "식품", "햇망고", "꿀", "오일", "냉동", "건어물"],
  beauty: ["파우더", "크림", "토너", "세럼", "에센스", "마스크팩", "시트마스크", "쿠션", "파운데이션", "립스틱", "틴트", "향수", "샴푸", "트리트먼트", "클렌징", "선크림", "선블록", "아이크림", "뷰티", "화장품", "메이크업", "스킨케어", "네일"],
  pet: ["강아지", "고양이", "반려", "애견", "애묘", "사료", "펫", "반려동물", "동물병원"],
  health: ["다이어트", "비타민", "콜라겐", "유산균", "프로바이오틱스", "효소", "건강", "영양제", "단백질", "프로틴", "체중감량", "홍삼", "루테인", "밀크씨슬", "글루타치온"],
  kids: ["아기", "유아", "영아", "이유식", "기저귀", "분유", "장난감", "키즈", "어린이", "아동", "유모차", "카시트"],
  kitchen: ["주방", "냄비", "프라이팬", "식기", "쓰레기", "청소", "세제", "이불", "침구", "매트", "소파", "가전", "리빙", "수납", "정리", "선풍기", "공기청정기", "로봇청소기", "에어컨"],
};

function inferUiCategory(productName: string, brief: string): string {
  const t = productName + " " + brief;
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) return cat;
  }
  return "other";
}

// 카테고리 풀에서 N개 무작위 샘플링 → 캡션 텍스트로 직렬화
function pickFewShots(category: string, n: number): string {
  const primary = fewShotPool.pool[category] ?? [];
  const fallback = fewShotPool.pool.other ?? [];
  const source = primary.length >= n ? primary : [...primary, ...fallback];
  if (source.length === 0) return "";
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, n);
  return picked
    .map(
      (p, i) =>
        `--- 예시 ${i + 1} (@${p.username}, 좋아요 ${p.likes.toLocaleString("ko-KR")}, 카테고리: ${p.subcat || p.uiCategory}) ---\n${p.caption}`
    )
    .join("\n\n");
}

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemini-2.5-flash";

interface GenerateRequest {
  product: ProductInput;
  context: GenerationContext;
  format: ScriptFormat;
  referenceReelId?: string;
}

async function fetchReelAsExample(reelId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );
  const { data } = await supabase
    .from("analyzed_reels")
    .select("url, duration_sec, gframe, persuasion_tags, category, recommended_for, hook_score, cta_strength, transcript, scenes")
    .eq("id", reelId)
    .single();

  if (!data || !data.gframe) return null;

  const reel: ReelAnalysisResult = {
    meta: { url: data.url, duration_sec: data.duration_sec },
    transcript: data.transcript ?? [],
    scenes: data.scenes ?? [],
    gframe: data.gframe,
    persuasion_tags: data.persuasion_tags ?? [],
    category: data.category ?? "",
    recommended_for: data.recommended_for ?? [],
    hook_score: data.hook_score ?? 0,
    cta_strength: data.cta_strength ?? 0,
  };
  return reelToFewShotExample(reel);
}

function validateBody(body: unknown): body is GenerateRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!b.product || typeof b.product !== "object") return false;
  if (!b.context || typeof b.context !== "object") return false;
  if (b.format !== "longform" && b.format !== "shorts" && b.format !== "post") return false;
  const p = b.product as Record<string, unknown>;
  if (typeof p.productName !== "string" || !p.productName.trim()) return false;
  return true;
}

// JSON Schema (Anthropic 형식) → Gemini responseSchema 형식 변환
// Gemini는 additionalProperties 미지원, 그 외 type/properties/required/description 동일
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "additionalProperties") continue;
    if (k === "properties" && v && typeof v === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: any = {};
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
        props[pk] = toGeminiSchema(pv);
      }
      out[k] = props;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  if (!validateBody(body)) {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다. product.productName과 format은 필수입니다." },
      { status: 400 }
    );
  }

  const { product, context, format, referenceReelId } = body;
  const config = FORMAT_CONFIG[format];

  // 레퍼런스 릴스가 지정된 경우 fetch해서 few-shot으로 컨텍스트에 주입
  let enrichedContext: GenerationContext = context;
  if (referenceReelId) {
    const example = await fetchReelAsExample(referenceReelId);
    if (example) {
      enrichedContext = { ...enrichedContext, referenceReelExample: example };
    }
  }

  // 인스타 공구 캡션 풀에서 카테고리에 맞는 샘플 3개 동적 주입 (Few-shot 학습)
  const inferredCat = inferUiCategory(product.productName, context.experience || "");
  const fewShotCaptions = pickFewShots(inferredCat, 3);
  if (fewShotCaptions) {
    enrichedContext = { ...enrichedContext, fewShotCaptions };
  }

  const ai = new GoogleGenAI({ apiKey });
  const userPrompt = buildUserPrompt(product, enrichedContext, format);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: config.systemPrompt,
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(config.schema),
        // 입력 상품·체험을 정확히 따르도록 낮춤 (창의성 < instruction following)
        temperature: 0.5,
        // Gemini 2.5 Flash는 thinking이 기본 활성 → maxOutputTokens를 잡아먹어 응답이 잘림.
        // 대본 생성은 reasoning이 깊지 않아도 되므로 thinking 비활성화.
        thinkingConfig: { thinkingBudget: 0 },
        // 잘림 방지를 위해 schema-defined 출력보다 넉넉히 부여
        maxOutputTokens: Math.max(config.maxTokens, 2500),
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { error: "모델이 빈 응답을 반환했습니다." },
        { status: 502 }
      );
    }

    let parsed: ScriptOutput;
    try {
      parsed = JSON.parse(text) as ScriptOutput;
    } catch (err) {
      return NextResponse.json(
        {
          error: "응답 JSON 파싱 실패",
          rawText: text,
          parseError: err instanceof Error ? err.message : String(err),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      format,
      script: parsed,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        cacheReadTokens: response.usageMetadata?.cachedContentTokenCount ?? 0,
      },
      model: MODEL,
      meta: {
        inferredCategory: inferredCat,
        fewShotSamplesUsed: fewShotCaptions ? 3 : 0,
        poolGeneratedAt: fewShotPool.generatedAt,
      },
    });
  } catch (err) {
    console.error("[/api/scripts/generate] Gemini API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
