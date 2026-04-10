import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * PATCH /api/okrs/key-results/[id] — KR 수정 (현재값 업데이트 등)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowed = ["title", "metric_type", "unit", "start_value", "current_value", "target_value", "note", "sort_order"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const sb = getServiceClient();
  const { data, error } = await sb.from("key_results").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // current_value 변경 시 체크인 기록
  if (body.current_value !== undefined) {
    await sb.from("okr_checkins").insert({
      key_result_id: id,
      value: Number(body.current_value),
      note: body.checkin_note || null,
    });
  }

  return NextResponse.json({ key_result: data });
}

/**
 * DELETE /api/okrs/key-results/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceClient();
  const { error } = await sb.from("key_results").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
