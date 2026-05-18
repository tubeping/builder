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
      enrichedContext = { ...context, referenceReelExample: example };
    }
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
    });
  } catch (err) {
    console.error("[/api/scripts/generate] Gemini API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
