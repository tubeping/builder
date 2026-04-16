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

// GET: 내 캠페인(공구 제안) 목록
export async function GET() {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, products(id, product_name)")
    .eq("creator_id", creatorId)
    .order("proposed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH: 캠페인 상태 변경 (승인/거절)
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await request.json();

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === "approved") {
    updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("campaigns")
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
