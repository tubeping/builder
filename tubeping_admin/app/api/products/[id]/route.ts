import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/products/[id] — 상품 상세 (매핑 포함)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceClient();

  const { data, error } = await sb
    .from("products")
    .select("*, product_cafe24_mappings(id, store_id, cafe24_product_no, cafe24_product_code, sync_status, last_sync_at)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "상품 조회 실패" }, { status: 404 });
  }

  return NextResponse.json({ product: data });
}

/**
 * PUT /api/products/[id] — 상품 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sb = getServiceClient();

  const update: Record<string, unknown> = {};
  const allowed = ["product_name", "price", "supply_price", "retail_price", "image_url", "selling", "category", "description", "memo"];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (["price", "supply_price", "retail_price"].includes(key)) {
        update[key] = Number(body[key]) || 0;
      } else {
        update[key] = body[key];
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("products")
    .update(update)
    .eq("id", id)
    .select("*, product_cafe24_mappings(id, store_id, cafe24_product_no, cafe24_product_code, sync_status, last_sync_at)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

/**
 * DELETE /api/products/[id] — 상품 삭제
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceClient();

  const { error } = await sb
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
