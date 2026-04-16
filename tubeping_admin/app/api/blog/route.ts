import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/** publish_log.json 경로 — 로컬 우선, Vercel은 public/ 폴백 */
function getLogPath(): string | null {
  // 1) 로컬: blog/publish_log.json
  const local = path.resolve(process.cwd(), "..", "blog", "publish_log.json");
  if (fs.existsSync(local)) return local;

  // 2) Vercel: public/publish_log.json
  const pub = path.resolve(process.cwd(), "public", "publish_log.json");
  if (fs.existsSync(pub)) return pub;

  return null;
}

/** 블로그 마크다운 파일에서 제목 추출 */
function extractTitle(filepath: string): string {
  try {
    const normalized = filepath.replace(/\\/g, "/");
    const abs = path.isAbsolute(normalized)
      ? normalized
      : path.resolve(process.cwd(), "..", normalized);
    const content = fs.readFileSync(abs, "utf-8");
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : "제목 없음";
  } catch {
    return "제목 없음";
  }
}

/** 마크다운 파일 글자 수 */
function getCharCount(filepath: string): number {
  try {
    const normalized = filepath.replace(/\\/g, "/");
    const abs = path.isAbsolute(normalized)
      ? normalized
      : path.resolve(process.cwd(), "..", normalized);
    const content = fs.readFileSync(abs, "utf-8");
    const body = content.replace(/^---[\s\S]*?---\n*/m, "");
    return body.replace(/\s/g, "").length;
  } catch {
    return 0;
  }
}

type PostEntry = {
  keyword: string;
  category: string;
  created_at: string;
  title?: string;
  char_count?: number;
  files: Record<string, string>;
  published: Record<string, boolean>;
  published_at?: string;
  images?: string[];
  image_prompts?: string[];
};

export async function GET() {
  try {
    const logPath = getLogPath();
    if (!logPath) {
      return NextResponse.json({ posts: [], summary: {} });
    }

    const raw = fs.readFileSync(logPath, "utf-8");
    const log = JSON.parse(raw);

    const posts = (log.posts || []).map((p: PostEntry, idx: number) => {
      const naverFile = p.files?.naver || "";
      const tistoryFile = p.files?.tistory || "";

      // 로컬에서는 마크다운 파일 직접 읽기, Vercel은 로그에 저장된 메타 사용
      let title = p.title || extractTitle(naverFile || tistoryFile);
      let charCount = p.char_count || getCharCount(naverFile || tistoryFile);

      // 제목 없으면 키워드로 대체
      if (title === "제목 없음") {
        title = `${p.keyword} — 자동 생성 콘텐츠`;
      }

      return {
        id: idx + 1,
        title,
        keyword: p.keyword,
        category: p.category,
        createdAt: p.created_at,
        publishedAt: p.published_at || null,
        naver: {
          published: p.published?.naver ?? false,
        },
        tistory: {
          published: p.published?.tistory ?? false,
        },
        imageCount: p.images?.length || 0,
        charCount,
      };
    });

    // 요약 통계
    const total = posts.length;
    const naverPublished = posts.filter(
      (p: { naver: { published: boolean } }) => p.naver.published,
    ).length;
    const tistoryPublished = posts.filter(
      (p: { tistory: { published: boolean } }) => p.tistory.published,
    ).length;
    const totalImages = posts.reduce(
      (sum: number, p: { imageCount: number }) => sum + p.imageCount,
      0,
    );
    const totalChars = posts.reduce(
      (sum: number, p: { charCount: number }) => sum + p.charCount,
      0,
    );

    const keywordStats: Record<string, number> = {};
    for (const p of posts) {
      keywordStats[(p as { keyword: string }).keyword] =
        (keywordStats[(p as { keyword: string }).keyword] || 0) + 1;
    }

    return NextResponse.json({
      posts: posts.reverse(),
      summary: {
        total,
        naverPublished,
        tistoryPublished,
        totalImages,
        totalChars,
        keywordStats,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e), posts: [], summary: {} },
      { status: 500 },
    );
  }
}
