import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const MALL_ID = process.env.CAFE24_MALL_ID || "tubeping";
const API_VERSION = "2026-03-01";

const APP_CREDENTIALS = [
  { id: process.env.CAFE24_CLIENT_ID || "z87I2H98I55vjYfonHPPhC", secret: process.env.CAFE24_CLIENT_SECRET || "sMdTZQkKLF1kNlBRqsdUTD" },
  { id: "5hl56sAYGJMmmrzCgZqwcC", secret: "vJghZUxLL9tgGmRFvs83BB" },
];

/* ── DB 기반 토큰 관리 ── */
async function getTokenFromDB(): Promise<string | null> {
  const sb = getServiceClient();
  const { data: store } = await sb.from("stores").select("id, access_token, refresh_token, token_expires_at, mall_id")
    .eq("mall_id", MALL_ID).single();
  if (!store) return null;

  // 만료 전이면 그대로
  const expiresAt = store.token_expires_at ? new Date(store.token_expires_at).getTime() : 0;
  if (store.access_token && expiresAt > Date.now() + 60000) return store.access_token;

  // API 테스트
  if (store.access_token) {
    const testRes = await fetch(`https://${MALL_ID}.cafe24api.com/api/v2/admin/products?limit=1`, {
      headers: { Authorization: `Bearer ${store.access_token}`, "X-Cafe24-Api-Version": API_VERSION },
    });
    if (testRes.ok) return store.access_token;
  }

  // 리프레시
  if (!store.refresh_token) return null;
  for (const app of APP_CREDENTIALS) {
    try {
      const res = await fetch(`https://${MALL_ID}.cafe24api.com/api/v2/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${app.id}:${app.secret}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: store.refresh_token }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.access_token) continue;
      await sb.from("stores").update({
        access_token: data.access_token, refresh_token: data.refresh_token,
        token_expires_at: data.expires_at, updated_at: new Date().toISOString(),
      }).eq("id", store.id);
      return data.access_token;
    } catch { continue; }
  }
  return null;
}

async function cafe24Fetch(url: string) {
  const token = await getTokenFromDB();
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Cafe24-Api-Version": API_VERSION,
  };

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

/**
 * POST /api/products/import-cafe24
 * 카페24 마스터 몰에서 상품을 가져와 TubePing 자체코드로 등록
 * - custom_product_code → tp_code로 사용
 * - 이미 존재하는 tp_code는 스킵
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = body.store_id; // 매핑할 스토어 ID (선택)

  const sb = getServiceClient();
  let imported = 0;
  let skipped = 0;
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await cafe24Fetch(
      `https://${MALL_ID}.cafe24api.com/api/v2/admin/products?limit=${limit}&offset=${offset}`
    );

    if (!data || !data.products || data.products.length === 0) break;

    for (const p of data.products) {
      // 자체코드 우선, 없으면 카페24 상품코드 사용
      const customCode = p.custom_product_code || p.product_code;
      if (!customCode) {
        skipped++;
        continue;
      }

      // 이미 존재하는지 확인
      const { data: existing } = await sb
        .from("products")
        .select("id")
        .eq("tp_code", customCode)
        .maybeSingle();

      if (existing) {
        // 이미 있으면 매핑만 추가
        if (storeId) {
          await sb
            .from("product_cafe24_mappings")
            .upsert(
              {
                product_id: existing.id,
                store_id: storeId,
                cafe24_product_no: p.product_no,
                cafe24_product_code: p.product_code,
                sync_status: "synced",
              },
              { onConflict: "product_id,store_id" }
            );
        }
        skipped++;
        continue;
      }

      // 새로 등록
      const img = p.list_image || p.detail_image || p.small_image || null;

      // 배리언트 정보 가져오기
      let variants: { variant_code: string; options: { name: string; value: string }[]; price: string; quantity: number; display: string; selling: string }[] = [];
      try {
        const detailData = await cafe24Fetch(
          `https://${MALL_ID}.cafe24api.com/api/v2/admin/products/${p.product_no}?embed=options,variants`
        );
        if (detailData?.product?.variants) {
          variants = detailData.product.variants;
        }
      } catch { /* skip variant fetch */ }

      const totalStock = variants.length > 0
        ? variants.reduce((sum: number, v: { quantity: number }) => sum + (v.quantity || 0), 0)
        : 0;

      const { data: newProduct, error } = await sb
        .from("products")
        .insert({
          tp_code: customCode,
          product_name: p.product_name || "",
          price: Number(p.price) || 0,
          supply_price: Number(p.supply_price) || 0,
          retail_price: Number(p.retail_price) || 0,
          image_url: img,
          selling: p.selling === "T" ? "T" : "F",
          description: p.simple_description || null,
          supplier: p.supplier_name || null,
          total_stock: totalStock,
        })
        .select("id")
        .single();

      if (error) {
        skipped++;
        continue;
      }

      // 배리언트 저장
      if (newProduct && variants.length > 0) {
        const variantRows = variants.map((v) => ({
          product_id: newProduct.id,
          variant_code: v.variant_code || null,
          option_name: v.options?.length > 0 ? v.options.map((o) => o.name).join("/") : null,
          option_value: v.options?.length > 0 ? v.options.map((o) => o.value).join("/") : null,
          price: Number(v.price) || 0,
          quantity: v.quantity || 0,
          display: v.display || "T",
          selling: v.selling || "T",
        }));
        await sb.from("product_variants").insert(variantRows);
      }

      // 매핑 생성
      if (newProduct) {
        if (storeId) {
          await sb
            .from("product_cafe24_mappings")
            .upsert(
              {
                product_id: newProduct.id,
                store_id: storeId,
                cafe24_product_no: p.product_no,
                cafe24_product_code: p.product_code,
                sync_status: "synced",
              },
              { onConflict: "product_id,store_id" }
            );
        }
        imported++;
      }
    }

    if (data.products.length < limit) break;
    offset += limit;
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    message: `${imported}개 상품 가져옴, ${skipped}개 스킵 (이미 존재/코드 없음)`,
  });
}
