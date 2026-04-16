import { NextResponse } from "next/server";
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

// GET: 수익 요약 (캠페인 매출 + 정산)
export async function GET() {
  const supabase = await getSupabase();
  const creatorId = await getCreatorId(supabase);

  if (!creatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 캠페인별 매출
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, status, actual_gmv, commission_rate, started_at, products(product_name)")
    .eq("creator_id", creatorId)
    .in("status", ["running", "completed", "settled"]);

  // 정산 내역
  const { data: settlements } = await supabase
    .from("settlements")
    .select("*")
    .in(
      "campaign_id",
      (campaigns || []).map((c) => c.id)
    )
    .order("created_at", { ascending: false });

  // 집계
  const totalGmv = (campaigns || []).reduce((s, c) => s + (c.actual_gmv || 0), 0);
  const totalCreatorNet = (settlements || []).reduce((s, s2) => s + (s2.creator_net || 0), 0);
  const pendingSettlements = (settlements || []).filter((s) => s.status === "pending").length;
  const completedSettlements = (settlements || []).filter((s) => s.status === "completed").length;

  return NextResponse.json({
    summary: {
      totalGmv,
      totalCreatorNet,
      pendingSettlements,
      completedSettlements,
      campaignCount: (campaigns || []).length,
    },
    campaigns: campaigns || [],
    settlements: settlements || [],
  });
}
