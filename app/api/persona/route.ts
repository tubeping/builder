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

// GET: 저장된 persona + 채널 정보 반환
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("channel_url, platform, subscriber_count, persona")
    .eq("email", user.email)
    .single();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({
    channel_url: creator.channel_url,
    platform: creator.platform,
    subscriber_count: creator.subscriber_count,
    persona: creator.persona ?? {},
  });
}

// PATCH: 수기 입력(연령/성별 분포 등) 갱신. persona JSONB의 manualInput 키에 머지.
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as { manualInput?: Record<string, unknown>; instagramHandle?: string }));

  const { data: existing } = await supabase
    .from("creators")
    .select("persona")
    .eq("email", user.email)
    .single();

  const current = (existing?.persona ?? {}) as Record<string, unknown>;
  const currentManual = (current.manualInput ?? {}) as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...current };
  if (body.manualInput && typeof body.manualInput === "object") {
    merged.manualInput = { ...currentManual, ...body.manualInput };
  }
  if (typeof body.instagramHandle === "string") {
    merged.instagramHandle = body.instagramHandle.trim();
  }

  const { error } = await supabase
    .from("creators")
    .update({ persona: merged })
    .eq("email", user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persona: merged });
}
