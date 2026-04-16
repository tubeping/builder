import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are an OCR assistant that extracts audience demographic data from social media analytics screenshots (YouTube Studio, Instagram Insights, TikTok Analytics).

Extract the following from the image and return ONLY valid JSON:

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

Rules:
- Ages should be percentage values (e.g., 33.4 not "33.4%")
- If an age range shows 0% or 0.0%, include it as 0
- If TikTok shows "55+" instead of "55-64" and "65+", put the value in "55-64" and leave "65+" as null
- genderFemale should be the female percentage (e.g., 40 means 40% female)
- If gender data is not visible in the screenshot, set genderFemale to null
- Return ONLY the JSON object, no markdown, no explanation`;

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
