import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/okrs?quarter=2026-Q2
 * 분기별 OKR 전체 (objectives + key_results 포함)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const quarter = sp.get("quarter") || currentQuarter();

  const sb = getServiceClient();

  const { data: objectives, error } = await sb
    .from("objectives")
    .select("*")
    .eq("quarter", quarter)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (objectives || []).map((o) => o.id);
  const { data: krs } = ids.length > 0
    ? await sb.from("key_results").select("*").in("objective_id", ids).order("sort_order", { ascending: true })
    : { data: [] };

  // 진행률 계산
  const withProgress = (objectives || []).map((o) => {
    const objKrs = (krs || []).filter((k) => k.objective_id === o.id).map((k) => ({
      ...k,
      progress: calcProgress(k),
    }));
    const avgProgress = objKrs.length > 0
      ? Math.round(objKrs.reduce((s, k) => s + k.progress, 0) / objKrs.length)
      : 0;
    return { ...o, key_results: objKrs, progress: avgProgress };
  });

  return NextResponse.json({ quarter, objectives: withProgress });
}

/**
 * POST /api/okrs — Objective 생성
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { quarter, title, description, category, priority, emoji, owner } = body;

  if (!quarter || !title) {
    return NextResponse.json({ error: "quarter, title 필수" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("objectives")
    .insert({ quarter, title, description, category, priority, emoji: emoji || "🎯", owner })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ objective: data });
}

function currentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

function calcProgress(kr: { start_value: number; current_value: number; target_value: number }): number {
  const start = Number(kr.start_value || 0);
  const cur = Number(kr.current_value || 0);
  const target = Number(kr.target_value || 0);
  if (target === start) return cur >= target ? 100 : 0;
  // 감소 목표 (예: 버그 25 → 0)
  if (target < start) {
    const total = start - target;
    const done = start - cur;
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }
  // 증가 목표
  const total = target - start;
  const done = cur - start;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}
