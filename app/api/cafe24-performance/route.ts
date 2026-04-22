/**
 * Cafe24 공구 판매 실적 집계 API (READ ONLY)
 *
 * Supabase orders 테이블(admin 소유)에서 최근 N일 데이터를
 * 카테고리별로 집계해 반환. 공구 적합도 판단용.
 *
 * 권한: admin 소유 테이블에 대한 READ ONLY (CLAUDE.md 보호 원칙 준수)
 *
 * 쿼리 파라미터:
 *   days: 집계 기간 (기본 90)
 *   category: 특정 카테고리만 필터 (선택)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

interface TopProduct {
  product_id: string;
  name: string;
  count: number;
  gmv: number;
  image_url?: string | null;
}

interface CategoryStats {
  category: string;
  order_count: number;
  unique_buyers: number;
  total_gmv: number;
  avg_order_value: number;
  repeat_rate: number;
  product_count: number;
  performance_score: number; // 0~100
  top_products: TopProduct[];
}

// 성과 점수: GMV 50% + 재구매율 30% + 주문수 20% (engine 로직과 동일)
function computePerformanceScore(stat: {
  total_gmv: number;
  repeat_rate: number;
  order_count: number;
}): number {
  const gmvScore = Math.min(100, (Math.log10(Math.max(stat.total_gmv, 1)) / 8) * 100);
  const repeatScore = Math.min(100, (stat.repeat_rate / 0.2) * 100);
  const orderScore = Math.min(100, (stat.order_count / 500) * 100);
  return Math.round((gmvScore * 0.5 + repeatScore * 0.3 + orderScore * 0.2) * 10) / 10;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const days = Math.max(1, Math.min(365, Number(searchParams.get("days") || 90)));
  const categoryFilter = searchParams.get("category");

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. admin orders 테이블 READ ONLY 조회 ─────────────────────
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("id, product_id, order_amount, quantity, buyer_email, order_date, product_name")
    .gte("order_date", since)
    .not("product_id", "is", null);

  if (ordersErr) {
    return NextResponse.json(
      { error: "주문 조회 실패", detail: ordersErr.message },
      { status: 500 }
    );
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({
      days,
      categories: [],
      total: { order_count: 0, total_gmv: 0, unique_buyers: 0 },
      generatedAt: new Date().toISOString(),
    });
  }

  // ── 2. products 카테고리 맵 조회 ──────────────────────────────
  const productIds = Array.from(
    new Set(orders.map((o) => o.product_id).filter(Boolean))
  ) as string[];

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, category, product_name, image_url")
    .in("id", productIds);

  const productMap = new Map<string, { category: string; name: string; image_url: string | null }>();
  for (const p of products || []) {
    productMap.set(p.id as string, {
      category: (p.category as string) || "기타",
      name: (p.product_name as string) || "",
      image_url: (p.image_url as string | null) || null,
    });
  }

  // ── 3. 카테고리별 집계 ─────────────────────────────────────────
  type Acc = {
    order_count: number;
    total_gmv: number;
    buyers: Set<string>;
    products: Map<string, TopProduct>;
  };
  const catAcc = new Map<string, Acc>();

  for (const o of orders) {
    const pid = o.product_id as string;
    const pinfo = productMap.get(pid);
    const cat = (pinfo?.category || "기타").trim() || "기타";

    if (categoryFilter && cat !== categoryFilter) continue;

    if (!catAcc.has(cat)) {
      catAcc.set(cat, {
        order_count: 0,
        total_gmv: 0,
        buyers: new Set(),
        products: new Map(),
      });
    }
    const a = catAcc.get(cat)!;
    a.order_count += 1;
    a.total_gmv += Number(o.order_amount) || 0;
    if (o.buyer_email) a.buyers.add(o.buyer_email as string);

    const pname = pinfo?.name || (o.product_name as string) || "상품";
    if (!a.products.has(pid)) {
      a.products.set(pid, {
        product_id: pid,
        name: pname,
        count: 0,
        gmv: 0,
        image_url: pinfo?.image_url || null,
      });
    }
    const p = a.products.get(pid)!;
    p.count += Number(o.quantity) || 0;
    p.gmv += Number(o.order_amount) || 0;
  }

  // ── 4. 정리 + 성과 점수 산출 ────────────────────────────────────
  const categories: CategoryStats[] = [];
  let grandOrder = 0;
  let grandGmv = 0;
  const grandBuyers = new Set<string>();

  for (const [cat, a] of catAcc.entries()) {
    const uniqueBuyers = a.buyers.size;
    const repeatRate = a.order_count > 0 ? (a.order_count - uniqueBuyers) / a.order_count : 0;
    const topProducts = Array.from(a.products.values())
      .sort((x, y) => y.gmv - x.gmv)
      .slice(0, 5);

    const score = computePerformanceScore({
      total_gmv: a.total_gmv,
      repeat_rate: repeatRate,
      order_count: a.order_count,
    });

    categories.push({
      category: cat,
      order_count: a.order_count,
      unique_buyers: uniqueBuyers,
      total_gmv: Math.round(a.total_gmv),
      avg_order_value: a.order_count > 0 ? Math.round(a.total_gmv / a.order_count) : 0,
      repeat_rate: Math.round(repeatRate * 1000) / 1000,
      product_count: a.products.size,
      performance_score: score,
      top_products: topProducts,
    });

    grandOrder += a.order_count;
    grandGmv += a.total_gmv;
    a.buyers.forEach((b) => grandBuyers.add(b));
  }

  categories.sort((a, b) => b.total_gmv - a.total_gmv);

  return NextResponse.json({
    days,
    categories,
    total: {
      order_count: grandOrder,
      total_gmv: Math.round(grandGmv),
      unique_buyers: grandBuyers.size,
    },
    generatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
  });
}
