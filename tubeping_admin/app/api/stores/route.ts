import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/stores — 전체 스토어 목록
 */
export async function GET() {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("stores")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ stores: data });
}

/**
 * POST /api/stores — 새 스토어 추가
 * body: { mall_id, name, channel?, subscribers?, store_url? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { mall_id, name, channel, subscribers, store_url } = body;

  if (!mall_id || !name) {
    return NextResponse.json({ error: "mall_id와 name은 필수입니다" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("stores")
    .insert({
      mall_id,
      name,
      channel: channel || null,
      subscribers: subscribers || 0,
      store_url: store_url || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 등록된 mall_id입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data });
}
