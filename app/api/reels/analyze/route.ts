import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { spawn } from "child_process";
import path from "path";
import type { ReelAnalysisResult } from "@/lib/prompts/reelAnalysis";

export const runtime = "nodejs";
export const maxDuration = 300; // 분석 최대 5분

const PYTHON_BIN =
  process.env.REEL_ANALYZER_PYTHON ||
  (process.platform === "win32" ? "python" : "python3");

// 기본 위치: tubeping-sourcing/analyze_reel.py (builder 부모 폴더 형제)
const SCRIPT_PATH =
  process.env.REEL_ANALYZER_SCRIPT ||
  path.resolve(process.cwd(), "..", "analyze_reel.py");

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

async function getCreatorId(
  supabase: ReturnType<typeof createServerClient>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("creators")
    .select("id")
    .eq("email", user.email)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

function isValidVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    // 인스타 릴스
    if (
      u.hostname.endsWith("instagram.com") &&
      /\/(reel|reels|p)\/[A-Za-z0-9_-]+/.test(u.pathname)
    ) {
      return true;
    }
    // 유튜브 쇼츠
    if (
      (u.hostname.endsWith("youtube.com") || u.hostname === "youtube.com") &&
      /\/shorts\/[A-Za-z0-9_-]+/.test(u.pathname)
    ) {
      return true;
    }
    // youtu.be 단축 (쇼츠 공유 시 자주 사용)
    if (u.hostname === "youtu.be" && /^\/[A-Za-z0-9_-]+/.test(u.pathname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function spawnAnalyzer(url: string): Promise<ReelAnalysisResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, [SCRIPT_PATH, url], {
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf-8")));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf-8")));

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        try {
          const errPayload = JSON.parse(stdout);
          if (errPayload.error)
            return reject(new Error(`분석 실패: ${errPayload.error}`));
        } catch {
          /* not JSON */
        }
        return reject(
          new Error(`분석기 종료 코드 ${code}\nstderr: ${stderr.slice(-500)}`)
        );
      }
      try {
        resolve(JSON.parse(stdout) as ReelAnalysisResult);
      } catch (e) {
        reject(
          new Error(
            `JSON 파싱 실패: ${(e as Error).message}\n출력 첫 300자: ${stdout.slice(0, 300)}`
          )
        );
      }
    });
  });
}

// POST: 새 릴스 분석
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);
  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!isValidVideoUrl(url)) {
    return NextResponse.json(
      { error: "인스타그램 릴스 또는 유튜브 쇼츠 URL을 입력하세요" },
      { status: 400 }
    );
  }

  // Vercel serverless에는 Python·yt-dlp·ffmpeg가 없어 분석기 spawn 불가
  // 로컬 dev 환경 또는 Vultr VPS 이전 후 활성화 예정
  if (process.env.VERCEL && !process.env.REEL_ANALYZER_FORCE_ENABLE) {
    return NextResponse.json(
      {
        error:
          "영상 분석은 현재 사이트(Vercel)에서 미지원입니다. " +
          "Python·yt-dlp·ffmpeg 의존성이 있어 로컬 개발 환경에서만 동작하며, " +
          "Vultr 서버 이전이 완료되면 사이트에서도 활성화 예정입니다.",
        environment: "vercel-unsupported",
      },
      { status: 503 }
    );
  }

  let result: ReelAnalysisResult;
  try {
    result = await spawnAnalyzer(url);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  // upsert (같은 사용자가 같은 URL 재분석 시 갱신)
  const { data, error } = await supabase
    .from("analyzed_reels")
    .upsert(
      {
        creator_id: creatorId,
        url: result.meta.url,
        duration_sec: Math.round(result.meta.duration_sec),
        source_username: result.meta.source_username || null,
        transcript: result.transcript,
        scenes: result.scenes,
        gframe: result.gframe,
        persuasion_tags: result.persuasion_tags,
        category: result.category,
        recommended_for: result.recommended_for,
        hook_score: result.hook_score,
        cta_strength: result.cta_strength,
        notes: body.notes ?? "",
        status: "completed",
        error_message: null,
      },
      { onConflict: "creator_id,url" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// GET: 내가 분석한 릴스 목록
export async function GET() {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);
  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("analyzed_reels")
    .select(
      "id, url, duration_sec, category, hook_score, cta_strength, gframe, persuasion_tags, notes, is_favorite, status, created_at"
    )
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
