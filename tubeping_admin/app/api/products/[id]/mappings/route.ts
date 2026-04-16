import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * POST /api/products/[id]/mappings — 카페24 매핑 추가
 * body: { store_id, cafe24_product_no?, cafe24_product_code? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { store_id, cafe24_product_no, cafe24_product_code } = body;

  if (!store_id) {
    return NextResponse.json({ error: "store_id는 필수입니다" }, { status: 400 });
  }

  const sb = getServiceClient();

  const { data, error } = await sb
    .from("product_cafe24_mappings")
    .upsert(
      {
        product_id: id,
        store_id,
        cafe24_product_no: cafe24_product_no || null,
        cafe24_product_code: cafe24_product_code || null,
        sync_status: "pending",
      },
      { onConflict: "product_id,store_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mapping: data });
}

/**
 * DELETE /api/products/[id]/mappings — 카페24 매핑 삭제
 * body: { store_id }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { store_id } = body;

  const sb = getServiceClient();

  const { error } = await sb
    .from("product_cafe24_mappings")
    .delete()
    .eq("product_id", id)
    .eq("store_id", store_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
