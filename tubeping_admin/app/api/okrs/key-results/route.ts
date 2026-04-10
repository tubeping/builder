import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * POST /api/okrs/key-results — KR 생성
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { objective_id, title, metric_type, unit, start_value, target_value, note } = body;

  if (!objective_id || !title || target_value === undefined) {
    return NextResponse.json({ error: "objective_id, title, target_value 필수" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("key_results")
    .insert({
      objective_id,
      title,
      metric_type: metric_type || "number",
      unit: unit || "",
      start_value: Number(start_value) || 0,
      current_value: Number(start_value) || 0,
      target_value: Number(target_value),
      note,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ key_result: data });
}
