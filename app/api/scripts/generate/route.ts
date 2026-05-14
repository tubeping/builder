import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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

const MODEL = "claude-sonnet-4-6";

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

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." },
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

  const client = new Anthropic({ apiKey });

  try {
    const createParams = {
      model: MODEL,
      max_tokens: config.maxTokens,
      system: [
        {
          type: "text",
          text: config.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildUserPrompt(product, enrichedContext, format),
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: config.schema,
        },
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const response = (await client.messages.create(createParams)) as Anthropic.Message;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "모델이 텍스트 블록을 반환하지 않았습니다.", stopReason: response.stop_reason },
        { status: 502 }
      );
    }

    let parsed: ScriptOutput;
    try {
      parsed = JSON.parse(textBlock.text) as ScriptOutput;
    } catch (err) {
      return NextResponse.json(
        {
          error: "응답 JSON 파싱 실패",
          rawText: textBlock.text,
          parseError: err instanceof Error ? err.message : String(err),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      format,
      script: parsed,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    console.error("[/api/scripts/generate] Anthropic API error:", err);

    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API 오류: ${err.message}`, status: err.status },
        { status: err.status || 500 }
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
