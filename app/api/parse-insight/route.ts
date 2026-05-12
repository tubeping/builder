import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a strict OCR transcriber. Your task is to copy EXACT percentage numbers from a social media analytics screenshot (YouTube Studio, Instagram Insights, TikTok Analytics). DO NOT estimate, round, or approximate. Read each digit precisely as it appears.

Return ONLY valid JSON in this exact shape:

{
  "ages": {
    "13-17": number_or_null,
    "18-24": number_or_null,
    "25-34": number_or_null,
    "35-44": number_or_null,
    "45-54": number_or_null,
    "55-64": number_or_null,
    "65+": number_or_null
  },
  "genderFemale": number_or_null
}

Critical rules:
- Read each percentage digit-by-digit. If the screenshot shows "12.9%", output exactly 12.9 — NOT 13, NOT 14.2, NOT any other number.
- Decimal place matters: "33.6%" is 33.6, not 33 or 34.
- A value of 0% or 0.0% must be output as 0 (not null).
- Korean YouTube Studio labels map as follows:
    "만 13-17세" → "13-17"
    "만 18-24세" → "18-24"
    "만 25-34세" → "25-34"
    "만 35-44세" → "35-44"
    "만 45-54세" → "45-54"
    "만 55-64세" → "55-64"
    "만 65세 이상" / "65세+" → "65+"
- If a label is missing from the image, set that field to null.
- TikTok edge case: if the screenshot shows a combined "55+" bucket (not separate 55-64 and 65+), put that value in "55-64" and set "65+" to null.
- genderFemale is the female percentage (e.g., 40 means 40% female). If gender data is not visible, set to null.
- Output ONLY the JSON object — no markdown fences, no explanation, no commentary.
- Before finalizing, re-read each number from the image and verify it matches your output exactly.`;

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const { image } = await request.json();
  if (!image) {
    return NextResponse.json({ error: "image (base64) required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" },
              },
              {
                type: "text",
                text: "Extract the audience age distribution and gender ratio from this analytics screenshot.",
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "OpenAI API error" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    // JSON 추출 (마크다운 코드블록 제거)
    let jsonStr = text;
    if (jsonStr.includes("```")) {
      const start = jsonStr.indexOf("{");
      const end = jsonStr.lastIndexOf("}") + 1;
      jsonStr = jsonStr.slice(start, end);
    }

    const parsed = JSON.parse(jsonStr);

    // ages에서 null 값 제거, 숫자로 변환
    const ages: Record<string, string> = {};
    if (parsed.ages) {
      for (const [key, val] of Object.entries(parsed.ages)) {
        if (val !== null && val !== undefined) {
          ages[key] = String(val);
        }
      }
    }

    return NextResponse.json({
      ages,
      genderFemale: parsed.genderFemale !== null ? String(parsed.genderFemale) : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 }
    );
  }
}
