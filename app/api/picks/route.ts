import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

async function getCreatorId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("email", user.email)
    .single();

  return creator?.id ?? null;
}

// GET: 내 PICK 목록
export async function GET() {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("creator_picks")
    .select("*, products(id, product_name)")
    .eq("creator_id", creatorId)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: PICK 추가
export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // 현재 최대 display_order 조회
  const { data: maxOrder } = await supabase
    .from("creator_picks")
    .select("display_order")
    .eq("creator_id", creatorId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("creator_picks")
    .insert({
      creator_id: creatorId,
      product_id: body.product_id || null,
      source_type: body.source_type || "tubeping_campaign",
      external_url: body.external_url || null,
      affiliate_code: body.affiliate_code || null,
      curation_comment: body.curation_comment || null,
      visible: body.visible ?? true,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH: PICK 수정 (visible, display_order, curation_comment)
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creator_picks")
    .update(updates)
    .eq("id", id)
    .eq("creator_id", creatorId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: PICK 삭제
export async function DELETE(request: NextRequest) {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("creator_picks")
    .delete()
    .eq("id", id)
    .eq("creator_id", creatorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
