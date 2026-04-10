import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/okrs/check — OKR 테이블 존재 여부 확인
 */
export async function GET() {
  const sb = getServiceClient();

  const { error: objErr } = await sb.from("objectives").select("id").limit(1);
  const { error: krErr } = await sb.from("key_results").select("id").limit(1);

  const objectivesExists = !objErr || !objErr.message.includes("does not exist");
  const krExists = !krErr || !krErr.message.includes("does not exist");

  return NextResponse.json({
    tables: {
      objectives: objectivesExists ? "✅ 존재" : "❌ 없음 (마이그레이션 필요)",
      key_results: krExists ? "✅ 존재" : "❌ 없음 (마이그레이션 필요)",
    },
    objErr: objErr?.message,
    krErr: krErr?.message,
    next_step: objectivesExists && krExists
      ? "DB 정상. 페이지가 안 보이면 dev 서버 재시작 (npm run dev)"
      : "Supabase Dashboard → SQL Editor → 006_okrs.sql 실행 필요",
  });
}
