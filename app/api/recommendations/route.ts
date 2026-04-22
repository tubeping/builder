import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const channel = searchParams.get("channel");

  const recDir = path.join(process.cwd(), "public", "recommendations");

  try {
    if (!channel) {
      const files = await fs.readdir(recDir);
      const channels = files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""));
      return NextResponse.json({ channels });
    }

    const filePath = path.join(recDir, `${channel}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(
      { error: "채널 추천 데이터를 찾을 수 없습니다", channel },
      { status: 404 }
    );
  }
}
