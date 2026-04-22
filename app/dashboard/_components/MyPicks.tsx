"use client";

import { useState, useEffect, useCallback } from "react";

// ─── 타입 ───
type SourceType = "tubeping_campaign" | "coupang" | "naver" | "own" | "other";
type FilterKey = "all" | SourceType;

// ─── 수익 계산 정책 ───
// 공식: 순마진 = (판매가 - 공급가 - PG수수료 3%) × (1 - 세금 10%)
//       인플루언서 수익 = 순마진 × 60%  (튜핑 40%)
const PG_FEE_RATE = 0.03;       // PG사 수수료 3%
const TAX_RATE = 0.10;           // 부가세 10% (세전 마진 기준)
const INFLUENCER_MARGIN_RATIO = 0.6;

// 카페24 tubeping 몰 상품 상세 URL
const CAFE24_PRODUCT_DETAIL_URL = (productNo: number) =>
  `https://tubeping.cafe24.com/product/detail.html?product_no=${productNo}`;

/**
 * 순마진 계산 (세후)
 * @returns { netMargin, influencer, tubeping, pgFee, tax }
 */
function calcMargin(price: number, supplyPrice: number) {
  if (price <= 0 || supplyPrice < 0 || price <= supplyPrice) {
    return { netMargin: 0, influencer: 0, tubeping: 0, pgFee: 0, tax: 0 };
  }
  const pgFee = price * PG_FEE_RATE;
  const preTax = price - supplyPrice - pgFee;
  const tax = preTax > 0 ? preTax * TAX_RATE : 0;
  const netMargin = preTax - tax;
  return {
    netMargin: Math.round(netMargin),
    influencer: Math.round(netMargin * INFLUENCER_MARGIN_RATIO),
    tubeping: Math.round(netMargin * (1 - INFLUENCER_MARGIN_RATIO)),
    pgFee: Math.round(pgFee),
    tax: Math.round(tax),
  };
}

function influencerEarning(price: number, supplyPrice: number): number {
  return calcMargin(price, supplyPrice).influencer;
}

// tubeping 공구 공통 배송비 정책 (차후 관리자 설정 연동 가능)
const SHIPPING_FEE = 3000;
const FREE_SHIPPING_THRESHOLD = 30000;

/**
 * Cafe24 배송비 타입 + 상품 가격 → 배송 레이블
 * T: 무료 / M: 조건부 무료 / R: 고정 유료 / D: 구간별 / W: 수량비례 / N: 배송비 없음
 *
 * @param feeType 카페24 shipping_fee_type 코드
 * @param price   상품 가격 (조건부 무료 판단용)
 */
function shippingBadge(
  feeType?: string,
  price: number = 0
): { label: string; icon: string; style: string } | null {
  if (!feeType) return null;
  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";

  switch (feeType) {
    case "T":
      return {
        label: "무료배송",
        icon: "🚚",
        style: "bg-emerald-50 text-emerald-700",
      };
    case "M": {
      // 조건부 무료: 가격이 기준 이상이면 무료, 아니면 배송비
      const qualifies = price >= FREE_SHIPPING_THRESHOLD;
      return qualifies
        ? {
            label: "무료배송",
            icon: "🚚",
            style: "bg-emerald-50 text-emerald-700",
          }
        : {
            label: `${fmt(SHIPPING_FEE)} (${FREE_SHIPPING_THRESHOLD / 10000}만원↑ 무료)`,
            icon: "🚚",
            style: "bg-sky-50 text-sky-700",
          };
    }
    case "R":
      return {
        label: `배송비 ${fmt(SHIPPING_FEE)}`,
        icon: "🚚",
        style: "bg-gray-100 text-gray-600",
      };
    case "D":
      return { label: "구간별 배송비", icon: "🚚", style: "bg-gray-100 text-gray-600" };
    case "W":
      return { label: "수량별 배송비", icon: "🚚", style: "bg-gray-100 text-gray-600" };
    case "N":
      return { label: "배송비 별도", icon: "🚚", style: "bg-gray-100 text-gray-500" };
    default:
      return null;
  }
}

interface PickItem {
  id: string;
  source_type: SourceType;
  product_id: string | null;
  external_url: string | null;
  affiliate_code: string | null;
  source_meta: Record<string, unknown>;
  display_order: number;
  visible: boolean;
  curation_comment: string;
  clicks: number;
  conversions: number;
  name: string;
  category: string;
  price: number;
  image: string | null;
  revenue: number;
}

interface Cafe24Product {
  product_no: number;
  product_code: string;
  product_name: string;
  price: string;
  supply_price: string;
  detail_image: string;
  list_image: string;
  small_image: string;
  selling: string;
  sold_out: string;
  created_date: string;
  shipping_fee_type?: string;
  shipping_fee_by_product?: string;
}

interface CoupangSearchProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryName: string;
  rank: number;
  isRocket: boolean;
}

// ─── 더미 데이터 ───
const FALLBACK_PICKS: PickItem[] = [
  {
    id: "p1", source_type: "tubeping_campaign", product_id: null, external_url: null,
    affiliate_code: null, source_meta: {}, display_order: 0, visible: true,
    curation_comment: "저도 매일 먹는 비타민입니다. 흡수가 잘 돼요.",
    clicks: 342, conversions: 47, revenue: 1840000,
    name: "프리미엄 비타민C 5000mg 90정", category: "건강식품", price: 29900,
    image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/c01e2014421c64300ca8a4c31d0d6ec9.jpg",
  },
  {
    id: "p2", source_type: "tubeping_campaign", product_id: null, external_url: null,
    affiliate_code: null, source_meta: {}, display_order: 1, visible: true,
    curation_comment: "", clicks: 198, conversions: 23, revenue: 894700,
    name: "유기농 프로틴 파우더 1kg", category: "건강식품", price: 38900, image: null,
  },
  {
    id: "p3", source_type: "coupang", product_id: null,
    external_url: "https://www.coupang.com/vp/products/123456",
    affiliate_code: "AF1234", source_meta: { commission_rate: 3 },
    display_order: 2, visible: true, curation_comment: "우리집 필수템!",
    clicks: 234, conversions: 8, revenue: 180000,
    name: "에어프라이어 5.5L 대용량", category: "생활", price: 89900, image: null,
  },
  {
    id: "p4", source_type: "naver", product_id: null,
    external_url: "https://smartstore.naver.com/example/products/789",
    affiliate_code: null, source_meta: {},
    display_order: 3, visible: false, curation_comment: "",
    clicks: 45, conversions: 2, revenue: 14000,
    name: "오설록 제주 녹차 선물세트", category: "식품", price: 35000, image: null,
  },
  {
    id: "p5", source_type: "own", product_id: null,
    external_url: "https://myshop.com/glass-cup",
    affiliate_code: null, source_meta: { custom_price: 40000, custom_image: null },
    display_order: 4, visible: true, curation_comment: "직접 디자인했어요",
    clicks: 567, conversions: 42, revenue: 1680000,
    name: "수현's 커스텀 유리컵", category: "생활", price: 40000, image: null,
  },
];

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function sourceLabel(source: SourceType) {
  const map: Record<SourceType, string> = {
    tubeping_campaign: "공구", coupang: "쿠팡", naver: "네이버", own: "직접", other: "기타",
  };
  return map[source];
}

function sourceBadgeStyle(source: SourceType) {
  const map: Record<SourceType, string> = {
    tubeping_campaign: "bg-[#C41E1E] text-white",
    coupang: "bg-[#e44232] text-white",
    naver: "bg-[#03C75A] text-white",
    own: "bg-[#111111] text-white",
    other: "bg-gray-500 text-white",
  };
  return map[source];
}

const IMAGE_PLACEHOLDER = (
  <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 공구 탭: Cafe24 인벤토리 바둑판 그리드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GongguTab({
  picks,
  onAddPick,
  onRemovePick,
  onToggleVisible,
  onEditComment,
}: {
  picks: PickItem[];
  onAddPick: (partial: Partial<PickItem>) => void;
  onRemovePick: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onEditComment: (id: string, comment: string) => void;
}) {
  const [products, setProducts] = useState<Cafe24Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const FALLBACK_CATEGORIES = [
    { id: 42, name: "식품" }, { id: 46, name: "건강" }, { id: 53, name: "생활" },
    { id: 47, name: "패션/뷰티" }, { id: 52, name: "캠핑/여행" }, { id: 51, name: "디지털/가전" },
  ];
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const PAGE_SIZE = 40;

  // 카페24 카테고리별 공구 실적 (사전 판매 예측)
  interface CategoryStats {
    category: string;
    order_count: number;
    total_gmv: number;
    repeat_rate: number;
    performance_score: number;
  }
  const [perfStats, setPerfStats] = useState<Map<string, CategoryStats>>(new Map());

  const pickedProductNos = new Set(
    picks
      .filter((p) => p.source_type === "tubeping_campaign")
      .map((p) => p.source_meta?.cafe24_product_no as number)
      .filter(Boolean)
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe24/categories");
      if (!res.ok) return;
      const data = await res.json();
      if (data.categories?.length > 0) setCategories(data.categories);
    } catch { /* 폴백 카테고리 유지 */ }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe24-performance?days=90");
      if (!res.ok) return;
      const data = await res.json();
      const map = new Map<string, CategoryStats>();
      for (const c of (data.categories as CategoryStats[]) || []) {
        map.set(c.category, c);
      }
      setPerfStats(map);
    } catch { /* 실적 데이터 없어도 OK */ }
  }, []);

  const fetchProducts = useCallback(async (opts?: { keyword?: string; category?: number | null; append?: boolean }) => {
    const isAppend = opts?.append || false;
    const nextOffset = isAppend ? offset + PAGE_SIZE : 0;
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(isAppend ? nextOffset : 0) });
    if (opts?.keyword?.trim()) params.set("keyword", opts.keyword.trim());
    const cat = opts?.category !== undefined ? opts.category : selectedCategory;
    if (cat) params.set("category", String(cat));
    const cacheKey = `cafe24_products::${params.toString()}`;

    // ── localStorage stale cache 즉시 표시 (재방문 UX) ──
    if (!isAppend && typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const { at, list } = JSON.parse(cachedRaw);
          const ageMs = Date.now() - at;
          // 10분 이내면 일단 화면에 바로 뿌림 (백그라운드 fetch로 갱신)
          if (ageMs < 10 * 60 * 1000 && Array.isArray(list)) {
            setProducts(list);
            setHasMore(list.length >= PAGE_SIZE);
            setLoaded(true);
            setLoading(false);
          }
        }
      } catch { /* ignore */ }
    }

    if (isAppend) setLoadingMore(true);
    else if (!loaded) setLoading(true); // 최초 로드에만 풀스크린 로딩
    setError("");

    try {
      const res = await fetch(`/api/cafe24/products?${params}`);
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      const list = data.products || [];
      if (isAppend) {
        setProducts((prev) => [...prev, ...list]);
        setOffset(nextOffset);
      } else {
        setProducts(list);
        setOffset(0);
        // 최신 결과 localStorage 캐시 저장
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), list }));
          } catch { /* quota 초과 등 무시 */ }
        }
      }
      setHasMore(list.length >= PAGE_SIZE);
      setLoaded(true);
    } catch {
      // 캐시 있으면 에러 표시 안 함 (stale 유지)
      if (products.length === 0) {
        setError("상품을 불러올 수 없습니다. 카페24 연동을 확인해주세요.");
        if (!isAppend) setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, selectedCategory, loaded, products.length]);

  useEffect(() => {
    if (!loaded) {
      fetchProducts();
      fetchCategories();
      fetchPerformance();
    }
  }, [loaded, fetchProducts, fetchCategories, fetchPerformance]);

  const handleCategoryChange = (catId: number | null) => {
    setSelectedCategory(catId);
    setLoaded(false);
    fetchProducts({ category: catId, keyword: search || undefined });
  };

  const handleSearch = () => {
    setLoaded(false);
    fetchProducts({ keyword: search || undefined });
  };

  const handleAddToPick = (product: Cafe24Product) => {
    onAddPick({
      source_type: "tubeping_campaign",
      name: product.product_name,
      price: Number(product.price),
      category: categories.find((c) => c.id === selectedCategory)?.name || "",
      image: product.list_image || product.detail_image || null,
      source_meta: {
        cafe24_product_no: product.product_no,
        cafe24_product_code: product.product_code,
        supply_price: Number(product.supply_price),
        shipping_fee_type: product.shipping_fee_type,
        shipping_fee_by_product: product.shipping_fee_by_product,
        name: product.product_name,
        price: Number(product.price),
        image: product.list_image || product.detail_image || null,
      },
    });
  };

  const gongguPicks = picks.filter((p) => p.source_type === "tubeping_campaign");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  return (
    <div className="space-y-6">
      {/* 이미 PICK된 공구 상품 */}
      {gongguPicks.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            내 공구 PICK <span className="text-[#C41E1E]">{gongguPicks.length}</span>
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {gongguPicks.map((pick) => {
              const supplyPrice = Number(pick.source_meta?.supply_price || 0);
              const pickMargin = calcMargin(pick.price, supplyPrice);
              const earning = pickMargin.influencer;
              const marginRate = pick.price > 0 ? (pickMargin.netMargin / pick.price) * 100 : 0;
              const cafe24ProductNo = pick.source_meta?.cafe24_product_no as number | undefined;
              const detailUrl = cafe24ProductNo ? CAFE24_PRODUCT_DETAIL_URL(cafe24ProductNo) : null;
              return (
              <div key={pick.id} className={`overflow-hidden rounded-lg border transition-colors ${pick.visible ? "border-[#C41E1E]" : "border-gray-200 opacity-60"}`}>
                {detailUrl ? (
                  <a href={detailUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer" title="카페24에서 상품 상세 보기">
                    <div className="relative aspect-[4/3] bg-gray-100 group">
                      {pick.image ? (
                        <img src={pick.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-gray-900 shadow-md">상세 보기 →</span>
                      </div>
                      <span className="absolute left-1.5 top-1.5 rounded bg-[#C41E1E] px-1.5 py-0.5 text-[9px] font-medium text-white">공구</span>
                    </div>
                  </a>
                ) : (
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {pick.image ? (
                      <img src={pick.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded bg-[#C41E1E] px-1.5 py-0.5 text-[9px] font-medium text-white">공구</span>
                  </div>
                )}
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-medium text-gray-900">{pick.name}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>
                  {earning > 0 && (
                    <p
                      className="text-[10px] font-medium text-green-600"
                      title={`판매가 ${formatPrice(pick.price)}\n- 공급가 ${formatPrice(supplyPrice)}\n- PG수수료 3% ${formatPrice(pickMargin.pgFee)}\n- 세금 10% ${formatPrice(pickMargin.tax)}\n= 순마진 ${formatPrice(pickMargin.netMargin)} (${marginRate.toFixed(1)}%)\n→ 인플루언서 60%: ${formatPrice(earning)}`}
                    >
                      수익 {formatPrice(earning)} <span className="text-gray-400 font-normal">({marginRate.toFixed(0)}% 마진)</span>
                    </p>
                  )}
                  {(() => {
                    const sb = shippingBadge(pick.source_meta?.shipping_fee_type as string | undefined, pick.price);
                    if (!sb) return null;
                    return (
                      <span className={`mt-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${sb.style}`}>
                        {sb.icon} {sb.label}
                      </span>
                    );
                  })()}
                  <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
                    <span>클릭 {pick.clicks}</span><span>전환 {pick.conversions}</span>
                  </div>
                  {editingId === pick.id ? (
                    <div className="mt-1.5 flex gap-1">
                      <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="코멘트"
                        className="flex-1 rounded border border-gray-300 px-1.5 py-0.5 text-[10px] outline-none focus:border-[#C41E1E]"
                        onKeyDown={(e) => { if (e.key === "Enter") { onEditComment(pick.id, commentDraft); setEditingId(null); } }} />
                      <button onClick={() => { onEditComment(pick.id, commentDraft); setEditingId(null); }}
                        className="cursor-pointer rounded bg-[#C41E1E] px-1.5 py-0.5 text-[9px] text-white">저장</button>
                    </div>
                  ) : pick.curation_comment ? (
                    <button onClick={() => { setEditingId(pick.id); setCommentDraft(pick.curation_comment); }}
                      className="mt-1 block w-full text-left text-[10px] italic text-gray-400 hover:text-gray-600 cursor-pointer truncate">
                      &ldquo;{pick.curation_comment}&rdquo;
                    </button>
                  ) : null}
                  <div className="mt-1.5 flex gap-1">
                    <button onClick={() => onToggleVisible(pick.id)} className={`flex-1 cursor-pointer rounded py-1 text-[10px] font-medium ${pick.visible ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {pick.visible ? "노출" : "숨김"}
                    </button>
                    <button onClick={() => onRemovePick(pick.id)} className="flex-1 cursor-pointer rounded bg-gray-50 py-1 text-[10px] text-gray-400 hover:text-red-500">삭제</button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {gongguPicks.length > 0 && (
        <div className="border-t border-dashed border-gray-200 pt-2">
          <p className="text-xs text-gray-400">카페24 인벤토리에서 상품을 골라 PICK에 추가하세요</p>
        </div>
      )}

      {/* Cafe24 인벤토리 브라우저 */}
      <div>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="공구 상품명으로 검색" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-20 text-sm outline-none focus:border-[#C41E1E]" />
            <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">검색</button>
          </div>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => handleCategoryChange(null)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${selectedCategory === null ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>전체</button>
              {categories.map((cat) => {
                const stat = perfStats.get(cat.name);
                const score = stat?.performance_score ?? null;
                const hot = score !== null && score >= 70;
                const warm = score !== null && score >= 50 && score < 70;
                return (
                  <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors flex items-center gap-1 ${
                      selectedCategory === cat.id
                        ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]"
                        : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    title={stat ? `과거 90일: ${stat.order_count}건 · 재구매율 ${(stat.repeat_rate * 100).toFixed(0)}%` : undefined}
                  >
                    <span>{cat.name}</span>
                    {hot && <span className="text-[9px]">🔥</span>}
                    {warm && <span className="text-[9px] text-amber-600">●</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 선택 카테고리 실적 요약 ── */}
        {selectedCategory !== null && (() => {
          const cat = categories.find((c) => c.id === selectedCategory);
          const stat = cat ? perfStats.get(cat.name) : null;
          if (!stat) return null;
          return (
            <div className="mt-3 rounded-lg border border-[#C41E1E]/20 bg-gradient-to-r from-red-50/50 to-white p-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-gray-900">{cat?.name}</span>
                <span className="text-gray-400">최근 90일</span>
                <span className="ml-auto flex items-center gap-2">
                  <span>주문 <b className="text-gray-900">{stat.order_count}</b>건</span>
                  <span>·</span>
                  <span>GMV <b className="text-gray-900">{(stat.total_gmv / 10000).toFixed(0)}만</b></span>
                  <span>·</span>
                  <span>재구매 <b className="text-gray-900">{(stat.repeat_rate * 100).toFixed(0)}%</b></span>
                  <span>·</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    stat.performance_score >= 70 ? "bg-[#C41E1E] text-white" :
                    stat.performance_score >= 50 ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    공구 적합도 {stat.performance_score.toFixed(0)}
                  </span>
                </span>
              </div>
            </div>
          );
        })()}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
              <p className="text-sm text-gray-500">카페24에서 상품을 불러오는 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-gray-600">{error}</p>
            <button onClick={() => fetchProducts()} className="mt-3 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]">다시 시도</button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-gray-500">{search ? `"${search}" 검색 결과` : "전체 공구 상품"} · {products.length}개</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((product) => {
                const isPicked = pickedProductNos.has(product.product_no);
                const price = Number(product.price);
                const supplyPrice = Number(product.supply_price);
                const margin = calcMargin(price, supplyPrice);
                const earning = margin.influencer;
                const marginRate = price > 0 ? (margin.netMargin / price) * 100 : 0;
                const isSoldOut = product.sold_out === "T";
                // 선택된 카테고리의 공구 적합도 (개별 상품 단위는 아니지만 카테고리 단위 힌트)
                const currentCat = categories.find((c) => c.id === selectedCategory);
                const catStat = currentCat ? perfStats.get(currentCat.name) : null;
                const hot = catStat && catStat.performance_score >= 70;
                return (
                  <div key={product.product_no} className={`overflow-hidden rounded-lg border transition-colors ${isPicked ? "border-[#C41E1E]" : "border-gray-200 hover:border-gray-300"} ${isSoldOut ? "opacity-50" : ""}`}>
                    <a
                      href={CAFE24_PRODUCT_DETAIL_URL(product.product_no)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-pointer"
                      title="카페24에서 상품 상세 보기"
                    >
                      <div className="relative aspect-[4/3] bg-gray-100 group">
                        {product.list_image || product.detail_image ? (
                          <img src={product.list_image || product.detail_image} alt={product.product_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                        )}
                        {/* hover 시 상세 보기 오버레이 */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-gray-900 shadow-md">
                            상세 보기 →
                          </span>
                        </div>
                        {isSoldOut && <span className="absolute left-1.5 top-1.5 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-white">품절</span>}
                        {isPicked && <span className="absolute right-1.5 top-1.5 rounded bg-[#C41E1E] px-1.5 py-0.5 text-[10px] font-medium text-white">PICK</span>}
                        {!isPicked && !isSoldOut && hot && (
                          <span className="absolute left-1.5 bottom-1.5 rounded bg-[#C41E1E]/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">🔥 적합</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-1 text-xs font-medium text-gray-900">{product.product_name}</p>
                        <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(price)}</p>
                        <p
                          className="text-[10px] font-medium text-green-600"
                          title={`판매가 ${formatPrice(price)}\n- 공급가 ${formatPrice(supplyPrice)}\n- PG수수료 3% ${formatPrice(margin.pgFee)}\n- 세금 10% ${formatPrice(margin.tax)}\n= 순마진 ${formatPrice(margin.netMargin)} (${marginRate.toFixed(1)}%)\n→ 인플루언서 60%: ${formatPrice(earning)}`}
                        >
                          수익 {formatPrice(earning)} <span className="text-gray-400 font-normal">({marginRate.toFixed(0)}% 마진)</span>
                        </p>
                        {(() => {
                          const sb = shippingBadge(product.shipping_fee_type, price);
                          if (!sb) return null;
                          return (
                            <span className={`mt-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${sb.style}`}>
                              {sb.icon} {sb.label}
                            </span>
                          );
                        })()}
                      </div>
                    </a>
                    <div className="px-2 pb-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!isSoldOut && !isPicked) handleAddToPick(product); }}
                        disabled={isSoldOut || isPicked}
                        className={`w-full cursor-pointer rounded py-1.5 text-xs font-medium transition-colors ${isSoldOut ? "bg-gray-100 text-gray-400 cursor-default" : isPicked ? "bg-gray-100 text-gray-500 cursor-default" : "bg-[#C41E1E] text-white hover:bg-[#A01818]"}`}
                      >
                        {isSoldOut ? "품절" : isPicked ? "PICK 완료" : "PICK 추가"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && hasMore && products.length > 0 && (
          <div className="mt-5 flex justify-center">
            <button onClick={() => fetchProducts({ append: true, keyword: search || undefined })} disabled={loadingMore}
              className="cursor-pointer rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {loadingMore ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />불러오는 중...</span> : "더보기"}
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && loaded && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-gray-500">{search ? `"${search}"에 해당하는 상품이 없습니다` : "등록된 공구 상품이 없습니다"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 쿠팡 파트너스 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CoupangTab({
  picks,
  onAddPick,
  onRemovePick,
  onToggleVisible,
}: {
  picks: PickItem[];
  onAddPick: (partial: Partial<PickItem>) => void;
  onRemovePick: (id: string) => void;
  onToggleVisible: (id: string) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<CoupangSearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [rankMode, setRankMode] = useState<"sales" | "click">("sales");
  const [selectedProduct, setSelectedProduct] = useState<CoupangSearchProduct | null>(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [loadingBest, setLoadingBest] = useState(false);

  // 쿠팡 파트너스 카테고리 (categoryId 매핑)
  const COUPANG_CATEGORIES: { id: number; label: string }[] = [
    { id: 0, label: "전체" },
    { id: 1012, label: "식품" },
    { id: 1014, label: "생활용품" },
    { id: 1013, label: "주방용품" },
    { id: 1015, label: "가구/홈인테리어" },
    { id: 1016, label: "가전디지털" },
    { id: 1010, label: "뷰티" },
    { id: 1001, label: "패션의류" },
    { id: 1024, label: "헬스/건강" },
    { id: 1029, label: "반려동물" },
    { id: 1011, label: "출산/유아동" },
    { id: 1017, label: "스포츠/레저" },
  ];
  const [selectedCatId, setSelectedCatId] = useState(0);

  // 저장된 API 키 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ak = localStorage.getItem("coupang_access_key") || "";
    const sk = localStorage.getItem("coupang_secret_key") || "";
    if (ak && sk) { setIsConnected(true); setAccessKey(ak); setSecretKey(sk); }
  }, []);

  // 카테고리 베스트셀러 로드 (연동 없어도 동작 — 플랫폼 키 사용)
  const loadBestsellers = useCallback(async (catId: number) => {
    setLoadingBest(true);
    try {
      const headers: Record<string, string> = {};
      if (accessKey && secretKey) {
        headers["x-coupang-access-key"] = accessKey;
        headers["x-coupang-secret-key"] = secretKey;
      }
      const res = await fetch(`/api/coupang/bestsellers?categoryId=${catId}&limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        const items = (data.items || []).map((it: Record<string, unknown>) => ({
          id: String(it.productId),
          productId: Number(it.productId),
          productName: String(it.productName || ""),
          productPrice: Number(it.productPrice || 0),
          productImage: String(it.productImage || ""),
          productUrl: String(it.productUrl || ""),
          categoryName: String(it.categoryName || ""),
          rank: Number(it.rank || 0),
          isRocket: Boolean(it.isRocket),
          // 기존 CoupangSearchProduct 필드 호환
          name: String(it.productName || ""),
          price: Number(it.productPrice || 0),
          image: String(it.productImage || ""),
          rating: 0,
          reviewCount: 0,
          commission: 3,
        }));
        setResults(items);
        setHasSearched(true);
      }
    } catch { /* ignore */ }
    finally { setLoadingBest(false); }
  }, [accessKey, secretKey]);

  // 탭 진입 시 전체 베스트 자동 로드
  useEffect(() => {
    loadBestsellers(0);
  }, [loadBestsellers]);

  const handleConnect = () => {
    if (!accessKey.trim() || !secretKey.trim()) return;
    localStorage.setItem("coupang_access_key", accessKey);
    localStorage.setItem("coupang_secret_key", secretKey);
    setIsConnected(true); setShowConnectModal(false);
    setToastMessage("쿠팡 파트너스 연동 완료!"); setTimeout(() => setToastMessage(""), 3000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setHasSearched(true);
    try {
      const res = await fetch(`/api/coupang/search?keyword=${encodeURIComponent(searchQuery)}&limit=20`, {
        headers: { "x-coupang-access-key": accessKey, "x-coupang-secret-key": secretKey },
      });
      if (res.ok) { const data = await res.json(); setResults(data.data || []); }
      else setResults([]);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  // 기존 모달 기반 플로우 유지 (백업용) — 이제는 잘 안 씀
  const handleGenerateLink = async (product: CoupangSearchProduct) => {
    setSelectedProduct(product); setGeneratingLink(true);
    try {
      const res = await fetch("/api/coupang/deeplink", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-coupang-access-key": accessKey, "x-coupang-secret-key": secretKey },
        body: JSON.stringify({ urls: [product.productUrl] }),
      });
      if (res.ok) { const data = await res.json(); setGeneratedLink(data.data?.[0]?.shortenUrl || data.data?.[0]?.landingUrl || ""); }
    } catch { /* ignore */ }
    finally { setGeneratingLink(false); }
  };

  const handleAddToPick = () => {
    if (!selectedProduct) return;
    onAddPick({
      source_type: "coupang", name: selectedProduct.productName, price: selectedProduct.productPrice,
      category: selectedProduct.categoryName || "", image: selectedProduct.productImage || null,
      external_url: generatedLink || selectedProduct.productUrl,
      affiliate_code: generatedLink ? "coupang_partners" : null,
      source_meta: { name: selectedProduct.productName, price: selectedProduct.productPrice, image: selectedProduct.productImage || null, category: selectedProduct.categoryName, commission_rate: 3, product_url: selectedProduct.productUrl, affiliate_link: generatedLink, is_rocket: selectedProduct.isRocket },
    });
    setSelectedProduct(null); setGeneratedLink("");
    setToastMessage("PICK에 추가되었습니다!"); setTimeout(() => setToastMessage(""), 3000);
  };

  // 원클릭 "내 몰에 담기" — 딥링크는 백그라운드 자동 생성
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const handleAddToMyMall = async (product: CoupangSearchProduct) => {
    setAddingProductId(product.productId);
    let affiliateLink = "";

    // 연동되어 있으면 딥링크 백그라운드 생성
    if (isConnected && accessKey && secretKey) {
      try {
        const res = await fetch("/api/coupang/deeplink", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-coupang-access-key": accessKey, "x-coupang-secret-key": secretKey },
          body: JSON.stringify({ urls: [product.productUrl] }),
        });
        if (res.ok) {
          const data = await res.json();
          affiliateLink = data.data?.[0]?.shortenUrl || data.data?.[0]?.landingUrl || "";
        }
      } catch { /* 실패해도 원본 URL로 담음 */ }
    }

    onAddPick({
      source_type: "coupang",
      name: product.productName,
      price: product.productPrice,
      category: product.categoryName || "",
      image: product.productImage || null,
      external_url: affiliateLink || product.productUrl,
      affiliate_code: affiliateLink ? "coupang_partners" : null,
      source_meta: {
        name: product.productName,
        price: product.productPrice,
        image: product.productImage || null,
        category: product.categoryName,
        commission_rate: 3,
        product_url: product.productUrl,
        affiliate_link: affiliateLink,
        is_rocket: product.isRocket,
      },
    });

    setAddingProductId(null);
    setToastMessage(
      affiliateLink
        ? "🛍️ 내 몰에 담았습니다! (파트너스 링크 적용)"
        : isConnected
          ? "🛍️ 내 몰에 담았습니다!"
          : "🛍️ 내 몰에 담았습니다! (연동 시 파트너스 수수료 받을 수 있어요)"
    );
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleCategoryClick = (catId: number) => {
    setSelectedCatId(catId);
    setSearchQuery("");
    loadBestsellers(catId);
  };

  const sortedResults = [...results].sort((a, b) => a.rank - b.rank);

  const coupangPicks = picks.filter((p) => p.source_type === "coupang");

  return (
    <div className="space-y-6">
      {toastMessage && <div className="fixed top-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm text-white shadow-lg">{toastMessage}</div>}

      {/* 온보딩 모달 (인팍 스타일 3단계) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <button onClick={() => setShowOnboarding(false)} className="absolute right-4 top-4 z-10 cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">{onboardingStep + 1}</div>
              {onboardingStep === 0 && (<><p className="text-xs text-gray-500">파트너스 탭 사용법</p><h3 className="mt-1 text-lg font-bold text-gray-900">홍보하고 싶은 쿠팡<br />상품을 검색해요</h3><p className="mt-2 text-xs text-gray-400">*최초 연동 1회 필요</p></>)}
              {onboardingStep === 1 && (<><p className="text-xs text-gray-500">파트너스 탭 사용법</p><h3 className="mt-1 text-lg font-bold text-gray-900">원하는 상품의 파트너스<br />링크를 생성해요</h3></>)}
              {onboardingStep === 2 && (<><p className="text-xs text-gray-500">파트너스 탭 사용법</p><h3 className="mt-1 text-lg font-bold text-gray-900">생성한 링크를 내 PICK에<br />바로 추가해요</h3></>)}
            </div>
            <div className="pb-6 text-center">
              <div className="mb-4 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (<button key={i} onClick={() => setOnboardingStep(i)} className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${onboardingStep === i ? "bg-gray-900" : "bg-gray-300"}`} />))}
              </div>
              {onboardingStep < 2
                ? <button onClick={() => setOnboardingStep((s) => s + 1)} className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">다음</button>
                : <button onClick={() => setShowOnboarding(false)} className="cursor-pointer rounded-lg bg-gray-900 px-8 py-2.5 text-sm font-medium text-white">닫기</button>}
            </div>
          </div>
        </div>
      )}

      {/* 연동 모달 */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0]">
                <span className="text-xl">🔑</span>
              </div>
            </div>
            <h3 className="mb-2 text-center text-lg font-bold text-gray-900">쿠팡 파트너스 내 계정 연동</h3>
            <p className="mb-4 text-center text-sm text-gray-500">
              연동하면 <b className="text-[#C41E1E]">판매 수수료가 내 계좌로</b> 들어갑니다
            </p>

            {/* 혜택 리스트 */}
            <div className="mb-5 space-y-2 rounded-xl bg-gray-50 p-4 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700"><b>본인 API 키</b>로 딥링크 생성 → 수수료 본인 계좌로 자동 입금 (쿠팡에서 직접)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700">튜핑은 API 키를 <b>중간에 보관하지 않음</b> (브라우저에만 저장)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700">통상 판매가의 <b>3% 수수료</b> 지급 (쿠팡 정책 기준)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Access Key</label>
                <input type="text" placeholder="쿠팡 파트너스에서 발급받은 Access Key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Secret Key</label>
                <input type="password" placeholder="쿠팡 파트너스에서 발급받은 Secret Key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
              </div>
            </div>

            <a
              href="https://partners.coupang.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#C41E1E] hover:underline"
            >
              쿠팡 파트너스 가입 및 API 키 발급 방법 →
            </a>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowConnectModal(false)} className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">닫기</button>
              <button onClick={handleConnect} disabled={!accessKey.trim() || !secretKey.trim()} className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-2.5 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-40 disabled:cursor-default">연동하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 링크 생성 모달 */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <button onClick={() => { setSelectedProduct(null); setGeneratedLink(""); }} className="absolute right-4 top-4 cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-6">
              <div className="mb-4 rounded-xl border border-gray-200 p-4">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {selectedProduct.productImage ? <img src={selectedProduct.productImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">{IMAGE_PLACEHOLDER}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">상품 정보</p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium text-gray-900">{selectedProduct.productName}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(selectedProduct.productPrice)}</p>
                  </div>
                </div>
              </div>
              {generatingLink ? (
                <div className="flex items-center justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" /><span className="ml-2 text-sm text-gray-500">링크 생성 중...</span></div>
              ) : generatedLink ? (
                <>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
                    <span className="text-green-500"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></span>
                    <span className="text-xs font-medium text-green-700">파트너스 링크 생성 완료</span>
                  </div>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="flex-1 truncate text-xs text-gray-500">{generatedLink}</span>
                    <button onClick={() => { navigator.clipboard.writeText(generatedLink); setToastMessage("복사됨!"); setTimeout(() => setToastMessage(""), 2000); }} className="cursor-pointer shrink-0 text-xs font-medium text-[#C41E1E] hover:underline">복사</button>
                  </div>
                  <div className="space-y-2">
                    <button onClick={handleAddToPick} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]">PICK에 바로 추가하기</button>
                    <button onClick={() => { setSelectedProduct(null); setGeneratedLink(""); }} className="w-full cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">확인</button>
                  </div>
                </>
              ) : (
                <button onClick={() => handleGenerateLink(selectedProduct)} className="w-full cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]">링크 생성</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 미연동 시 수익 안내 배너 */}
      {!isConnected && (
        <div className="rounded-xl border border-[#C41E1E]/30 bg-gradient-to-r from-[#fff0f0] to-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C41E1E]/10 text-lg">💰</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                내 쿠팡 파트너스 연동하면 <span className="text-[#C41E1E]">판매 수수료가 내 계좌로</span> 들어가요
              </p>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                연동 전: 내 몰에 상품은 담을 수 있지만 수수료 <b className="text-gray-400">없음</b>.
                연동 후: 본인 API 키로 딥링크 자동 생성 → 쿠팡이 직접 내 계좌로 지급 (튜핑은 중간 개입 X)
              </p>
            </div>
            <button
              onClick={() => setShowConnectModal(true)}
              className="shrink-0 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-xs font-bold text-white hover:bg-[#A01818]"
            >
              연동하기
            </button>
          </div>
        </div>
      )}

      {/* 검색 영역 */}
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">상품 찾기</h3>
            {isConnected && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">연동됨</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setOnboardingStep(0); setShowOnboarding(true); }} className="cursor-pointer flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              파트너스 사용법
            </button>
            {!isConnected && <button onClick={() => setShowConnectModal(true)} className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">연동하기</button>}
          </div>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="쿠팡 상품명으로 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { isConnected ? handleSearch() : setShowConnectModal(true); } }}
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-20 text-sm outline-none focus:border-[#C41E1E]" />
          <button onClick={() => { isConnected ? handleSearch() : setShowConnectModal(true); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">검색</button>
        </div>
        {/* 랭킹 토글 (인포크링크 스타일) */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setRankMode("sales")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              rankMode === "sales" ? "bg-[#111111] text-white" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            👑 판매 랭킹
          </button>
          <button
            onClick={() => setRankMode("click")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              rankMode === "click" ? "bg-[#111111] text-white" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📈 클릭 랭킹
          </button>
          <span className="ml-auto text-[10px] text-gray-400">카테고리별 TOP</span>
        </div>

        {/* 카테고리 필터 (가로 스크롤) */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {COUPANG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
                selectedCatId === cat.id
                  ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]"
                  : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {(searching || loadingBest) && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
          <span className="ml-3 text-sm text-gray-500">상품 불러오는 중...</span>
        </div>
      )}

      {/* 상품 그리드 */}
      {!searching && !loadingBest && hasSearched && results.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-900">
            상품 추천 <span className="text-gray-400">· {results.length}개</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedResults.map((product, idx) => {
              const isPicked = coupangPicks.some((p) => (p.source_meta?.product_url as string)?.includes(String(product.productId)));
              return (
                <div key={product.productId || idx} className={`overflow-hidden rounded-xl border transition-colors ${isPicked ? "border-[#C41E1E]" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="relative aspect-square bg-gray-100">
                    {product.productImage ? <img src={product.productImage} alt={product.productName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">{IMAGE_PLACEHOLDER}</div>}
                    {/* 순위 배지 */}
                    {product.rank > 0 && (
                      <span className="absolute left-2 top-2 flex h-7 min-w-[28px] items-center justify-center rounded-md bg-[#F97316] px-1.5 text-sm font-extrabold text-white shadow-sm">
                        {product.rank}
                      </span>
                    )}
                    {/* 상품 정보 외부 링크 */}
                    {product.productUrl && (
                      <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-2 flex items-center gap-0.5 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm hover:bg-white"
                        title="쿠팡 상품 페이지 열기"
                      >
                        상품 정보
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {product.isRocket && (
                      <span className="absolute right-2 bottom-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">로켓</span>
                    )}
                    {isPicked && (
                      <span className="absolute left-2 bottom-2 rounded bg-[#C41E1E] px-2 py-0.5 text-xs font-medium text-white">PICK</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">{product.productName}</p>
                    <p className="mt-1.5 text-base font-bold text-gray-900">{formatPrice(product.productPrice)}</p>
                    {product.categoryName && <p className="mt-0.5 text-xs text-gray-400">{product.categoryName}</p>}
                    <button
                      onClick={() => {
                        if (isPicked) return;
                        handleAddToMyMall(product);
                      }}
                      disabled={isPicked || addingProductId === product.productId}
                      className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                        isPicked
                          ? "bg-gray-100 text-gray-400 cursor-default"
                          : "bg-[#C41E1E] text-white hover:bg-[#A01818]"
                      }`}
                    >
                      {isPicked ? (
                        "✓ 담기 완료"
                      ) : addingProductId === product.productId ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          담는 중...
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          내 몰에 담기
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!searching && !loadingBest && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-gray-500">상품이 없습니다. 다른 카테고리/검색어로 시도해보세요.</p>
        </div>
      )}

      {/* 이미 PICK된 쿠팡 상품 */}
      {coupangPicks.length > 0 && (
        <div className="border-t border-gray-200 pt-5">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">내 쿠팡 PICK <span className="text-[#C41E1E]">{coupangPicks.length}</span></h4>
          <div className="space-y-2">
            {coupangPicks.map((pick) => (
              <div key={pick.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{pick.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400"><span>{formatPrice(pick.price)}</span><span>·</span><span>수수료 3%</span><span>·</span><span>클릭 {pick.clicks}</span></div>
                </div>
                <button onClick={() => onToggleVisible(pick.id)} className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{pick.visible ? "노출" : "숨김"}</button>
                <button onClick={() => onRemovePick(pick.id)} className="cursor-pointer text-gray-400 hover:text-red-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 쇼핑 탭 (검색 + 카테고리별 추천)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface NaverShopItem {
  productId: string;
  title: string;
  link: string;
  image: string;
  price: number;
  maxPrice: number;
  mallName: string;
  brand: string;
  category: string;
}

// 네이버 쇼핑커넥트/공동구매 — 본인 발급 링크 붙여넣기 전용 (심플)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function NaverTab({
  picks, onAddPick, onRemovePick, onToggleVisible,
}: {
  picks: PickItem[];
  onAddPick: (partial: Partial<PickItem>) => void;
  onRemovePick: (id: string) => void;
  onToggleVisible: (id: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");

  const CATEGORIES = ["식품", "생활/건강", "뷰티/화장품", "패션/의류", "디지털/가전", "주방용품", "가구/인테리어", "유아동", "반려동물", "스포츠/레저", "기타"];

  // Headless Chrome으로 자동 가져오기
  const handleAutoFetch = async () => {
    const u = url.trim();
    if (!u) { setFetchMsg("판매 링크를 먼저 입력해주세요"); return; }
    setFetching(true); setFetchMsg("");
    try {
      const res = await fetch(`/api/unfurl-headless?url=${encodeURIComponent(u)}`);
      if (!res.ok) { setFetchMsg("자동 추출에 실패했어요. 수동으로 입력해주세요"); return; }
      const data = await res.json();

      const isGeneric = !data.title || /네이버\s*브랜드\s*커넥트/i.test(data.title);
      const hasImage = !!data.image;

      if (!isGeneric && data.title) setName(data.title);
      if (hasImage) setImageUrl(data.image);
      if (data.price > 0) setPrice(String(Math.round(data.price)));

      if (!isGeneric && hasImage) {
        setFetchMsg("✅ 자동 추출 성공!");
      } else if (hasImage || !isGeneric) {
        setFetchMsg("⚠️ 일부만 가져왔어요. 나머지는 수동으로 채워주세요");
      } else {
        setFetchMsg("자동 추출에 실패했어요. 수동으로 입력해주세요");
      }
    } catch {
      setFetchMsg("네트워크 오류. 수동으로 입력해주세요");
    } finally {
      setFetching(false);
      setTimeout(() => setFetchMsg(""), 5000);
    }
  };

  const naverPicks = picks.filter((p) => p.source_type === "naver");

  const handleSubmit = () => {
    if (!url.trim()) { setToastMessage("⚠️ 판매 링크를 입력해주세요"); setTimeout(() => setToastMessage(""), 2500); return; }
    if (!name.trim()) { setToastMessage("⚠️ 상품명을 입력해주세요"); setTimeout(() => setToastMessage(""), 2500); return; }
    if (!category) { setToastMessage("⚠️ 카테고리를 선택해주세요"); setTimeout(() => setToastMessage(""), 2500); return; }

    onAddPick({
      source_type: "naver",
      name: name.trim(),
      price: parseInt(price) || 0,
      category,
      image: imageUrl.trim() || null,
      external_url: url.trim(),
      affiliate_code: null,
      curation_comment: comment.trim(),
      source_meta: {
        name: name.trim(),
        price: parseInt(price) || 0,
        image: imageUrl.trim() || null,
        category,
        source_url: url.trim(),
        site_name: "네이버",
      },
    });

    // 리셋
    setUrl(""); setName(""); setPrice(""); setImageUrl(""); setCategory(""); setComment("");
    setToastMessage("내 몰에 담았습니다!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-lg bg-[#03C75A] px-5 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* 상단 가이드 */}
      <div className="rounded-xl border border-[#03C75A]/30 bg-gradient-to-br from-[#03C75A]/5 to-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#03C75A] text-base font-bold text-white">N</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">
              네이버 쇼핑커넥트/공동구매 <span className="text-[#03C75A]">본인 발급 링크</span>만 등록
            </p>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              판매는 네이버에서 진행 · 수수료는 <b className="text-[#03C75A]">본인 계좌로 자동 입금</b> (네이버가 직접)
              <br />
              이미지/제목/가격은 <b>네이버 쇼핑 상품 페이지에서 복사해 붙여넣으시면</b> 됩니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="https://partner.naver.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-[#03C75A] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#02b051]">
                쇼핑커넥트 가입 →
              </a>
              <a href="https://brandconnect.naver.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[#03C75A] bg-white px-3 py-1.5 text-[11px] font-bold text-[#03C75A] hover:bg-[#03C75A]/5">
                브랜드커넥트 →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2컬럼 레이아웃: 좌측 입력 폼 / 우측 내 몰 미리보기 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* 좌측: 입력 폼 */}
      <div className="lg:col-span-3 rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            판매 링크 <span className="text-[#C41E1E]">*</span>
            <span className="ml-2 text-[10px] font-normal text-gray-400">네이버 발급 링크 그대로 붙여넣기</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://naver.me/... 또는 brandconnect.naver.com/..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#03C75A]"
            />
            <button
              onClick={handleAutoFetch}
              disabled={fetching || !url.trim()}
              className="cursor-pointer rounded-lg bg-[#111111] px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
              title="Headless Chrome이 실제 브라우저처럼 페이지를 열어 이미지/제목/가격을 자동으로 가져옵니다"
            >
              {fetching ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  가져오는 중
                </span>
              ) : "🤖 자동으로 채우기"}
            </button>
          </div>
          {fetchMsg && (
            <p className={`mt-1.5 text-xs ${
              fetchMsg.startsWith("✅") ? "text-green-600" :
              fetchMsg.startsWith("⚠️") ? "text-amber-600" :
              "text-red-500"
            }`}>{fetchMsg}</p>
          )}
          <p className="mt-1 text-[10px] text-gray-400">
            ⏱️ 자동 가져오기는 3~10초 걸려요 (실제 브라우저로 로드해서 느려요). 안 되면 아래에 직접 입력.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            상품명 <span className="text-[#C41E1E]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 오설록 제주 녹차 선물세트"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#03C75A]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="35000"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#03C75A]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              카테고리 <span className="text-[#C41E1E]">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#03C75A] bg-white"
            >
              <option value="">선택하세요</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            상품 이미지 URL
            <span className="ml-2 text-[10px] font-normal text-gray-400">네이버 상품 페이지에서 이미지 우클릭 &gt; 주소 복사</span>
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://shop-phinf.pstatic.net/..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#03C75A]"
          />
        </div>

        {/* 라이브 미리보기 */}
        {(name || imageUrl) && (
          <div className="rounded-xl border-2 border-dashed border-[#03C75A]/30 bg-[#03C75A]/5 p-3">
            <p className="text-[10px] font-bold text-[#03C75A] mb-2">✨ 내 몰에 이렇게 표시됩니다</p>
            <div className="flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-[#03C75A] px-2 py-0.5 text-[9px] font-medium text-white">네이버</span>
                <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 leading-snug">{name || "상품명 입력 필요"}</p>
                {parseInt(price) > 0 && <p className="text-base font-bold text-[#03C75A]">{formatPrice(parseInt(price))}</p>}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">큐레이션 코멘트</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="이 상품을 추천하는 이유를 한 줄로"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#03C75A]"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSubmit}
            disabled={!url.trim() || !name.trim() || !category}
            className="cursor-pointer rounded-lg bg-[#03C75A] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#02b051] disabled:opacity-40 disabled:cursor-default"
          >
            내 몰에 담기
          </button>
        </div>
      </div>

      {/* 우측: 내 몰 미리보기 + 담긴 상품 리스트 */}
      <div className="lg:col-span-2 space-y-3 lg:sticky lg:top-4 lg:self-start">
        {/* 미리보기 헤더 */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#03C75A] animate-pulse" />
              <h3 className="text-sm font-bold text-gray-900">내 네이버 PICK</h3>
              <span className="rounded-full bg-[#03C75A] px-2 py-0.5 text-[10px] font-bold text-white">{naverPicks.length}</span>
            </div>
            <a
              href="/shop/gwibinjeong"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
            >
              내 몰 열기
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* 담긴 상품 리스트 (공개 쇼핑몰 카드 스타일) */}
          {naverPicks.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">아직 담긴 상품이 없어요</p>
              <p className="mt-0.5 text-[10px] text-gray-400">왼쪽에서 링크를 붙여넣고 담아보세요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {naverPicks.map((pick) => (
                <div key={pick.id} className={`flex gap-3 p-3 transition-colors ${pick.visible ? "" : "opacity-50"}`}>
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {pick.image ? (
                      <img src={pick.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-[#03C75A]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#03C75A]">네이버</span>
                      {pick.category && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">{pick.category}</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-gray-900 leading-snug">{pick.name}</p>
                    {pick.price > 0 && (
                      <p className="mt-0.5 text-sm font-bold text-[#03C75A]">{formatPrice(pick.price)}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>클릭 {pick.clicks}</span>
                      {pick.external_url && (
                        <a href={pick.external_url} target="_blank" rel="noopener noreferrer"
                          className="text-[#03C75A] hover:underline">링크 ↗</a>
                      )}
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      <button onClick={() => onToggleVisible(pick.id)}
                        className={`cursor-pointer rounded px-2 py-0.5 text-[9px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                        {pick.visible ? "노출중" : "숨김"}
                      </button>
                      <button onClick={() => onRemovePick(pick.id)}
                        className="cursor-pointer rounded px-2 py-0.5 text-[9px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-500">
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 쇼핑몰 스타일 힌트 */}
        <div className="rounded-xl border border-dashed border-gray-200 p-3">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            💡 담긴 상품은 <b>내 공개 쇼핑몰</b>의 PICK 블록에 자동 노출됩니다.
            순서나 레이아웃은 <b>몰 꾸미기</b> 탭에서 조정할 수 있어요.
          </p>
        </div>
      </div>

      </div> {/* 2컬럼 grid end */}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 직접 상품 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OwnProductTab({
  picks, onAddPick, onRemovePick, onToggleVisible, onEditComment,
}: {
  picks: PickItem[]; onAddPick: (partial: Partial<PickItem>) => void; onRemovePick: (id: string) => void; onToggleVisible: (id: string) => void; onEditComment: (id: string, comment: string) => void;
}) {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [price, setPrice] = useState("");
  const [category, setCategory] = useState(""); const [imageUrl, setImageUrl] = useState(""); const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null); const [commentDraft, setCommentDraft] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [sourceLabel, setSourceLabel] = useState<string>(""); // 쿠팡/네이버/스마트스토어 등

  const OWN_CATEGORIES = ["패션/의류", "뷰티/화장품", "식품", "생활용품", "디지털/가전", "굿즈/MD", "핸드메이드", "기타"];

  const resetForm = () => {
    setUrl(""); setName(""); setPrice(""); setCategory("");
    setImageUrl(""); setComment(""); setFetchError(""); setSourceLabel("");
  };

  // 도메인 기반 사이트 라벨 추정 (badge)
  const detectSource = (u: string): string => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (host.includes("coupang")) return "쿠팡";
      if (host.includes("smartstore.naver") || host.includes("shopping.naver")) return "스마트스토어";
      if (host.includes("11st")) return "11번가";
      if (host.includes("gmarket")) return "G마켓";
      if (host.includes("auction")) return "옥션";
      if (host.includes("wadiz")) return "와디즈";
      if (host.includes("tubeping")) return "튜핑";
      if (host.includes("cafe24")) return "Cafe24";
      return host.replace(/^www\./, "").split(".")[0];
    } catch { return ""; }
  };

  // URL → 상품 정보 자동 추출 (/api/unfurl)
  const handleFetchUrl = async () => {
    const u = url.trim();
    if (!u) { setFetchError("URL을 입력하세요"); return; }
    try { new URL(u); } catch { setFetchError("유효하지 않은 URL"); return; }

    setFetching(true); setFetchError("");
    try {
      const res = await fetch(`/api/unfurl?url=${encodeURIComponent(u)}`);
      if (!res.ok) { setFetchError("상품 정보를 가져올 수 없습니다"); return; }
      const data = await res.json();

      if (data.title) setName(data.title);
      if (data.image) setImageUrl(data.image);
      if (data.price) setPrice(String(Math.round(data.price)));
      setSourceLabel(detectSource(u));
    } catch {
      setFetchError("네트워크 오류. 다시 시도해주세요");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAddPick({
      source_type: "own", name: name.trim(), price: parseInt(price) || 0, category: category || "기타",
      image: imageUrl.trim() || null, external_url: url.trim() || null, curation_comment: comment.trim(),
      source_meta: {
        name: name.trim(),
        price: parseInt(price) || 0,
        image: imageUrl.trim() || null,
        category: category || "기타",
        custom_price: parseInt(price) || 0,
        source_label: sourceLabel || undefined,
      },
    });
    resetForm();
  };

  const ownPicks = picks.filter((p) => p.source_type === "own");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-5">
        <h3 className="text-base font-semibold text-gray-900">내 상품 등록</h3>
        <p className="mt-1 text-sm text-gray-500">자체 제작 굿즈, 핸드메이드, 자사몰 상품 등을 직접 등록해서 팬들에게 공유하세요.</p>
      </div>

      {/* 등록 방식 */}
      <div className="flex gap-2">
        <button onClick={() => setMode("url")} className={`cursor-pointer flex-1 rounded-xl border-2 p-4 text-left transition-colors ${mode === "url" ? "border-[#C41E1E] bg-[#fff5f5]" : "border-gray-200 hover:border-gray-300"}`}>
          <svg className="mb-1 h-6 w-6 text-[#C41E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          <p className="text-sm font-medium text-gray-900">URL로 등록</p><p className="mt-0.5 text-xs text-gray-500">자사몰, 스마트스토어 등 판매 링크</p>
        </button>
        <button onClick={() => setMode("manual")} className={`cursor-pointer flex-1 rounded-xl border-2 p-4 text-left transition-colors ${mode === "manual" ? "border-[#C41E1E] bg-[#fff5f5]" : "border-gray-200 hover:border-gray-300"}`}>
          <svg className="mb-1 h-6 w-6 text-[#C41E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          <p className="text-sm font-medium text-gray-900">직접 입력</p><p className="mt-0.5 text-xs text-gray-500">상품 정보를 수동으로 입력</p>
        </button>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 p-5 space-y-4">
        {mode === "url" && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">판매 링크 *</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleFetchUrl(); }}
                  placeholder="쿠팡·네이버·스마트스토어·자사몰 등 모든 URL"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={fetching || !url.trim()}
                  className="cursor-pointer rounded-lg bg-[#111111] px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
                >
                  {fetching ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      분석 중
                    </span>
                  ) : "자동 가져오기"}
                </button>
              </div>
              {fetchError && <p className="mt-1.5 text-xs text-red-500">{fetchError}</p>}
              <p className="mt-1.5 text-[11px] text-gray-400">
                링크만 붙여넣으면 이미지/상품명/가격을 자동으로 가져옵니다. 수정도 가능해요.
              </p>
            </div>

            {/* 미리보기 카드 (네이버 상품 찾기 스타일) */}
            {(imageUrl || name) && (
              <div className="rounded-xl border-2 border-dashed border-[#C41E1E]/30 bg-gradient-to-br from-[#fff5f5] to-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[#C41E1E]">✨ 미리보기</span>
                  {sourceLabel && (
                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-medium text-white">
                      {sourceLabel}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug">
                      {name || "상품명을 입력하세요"}
                    </p>
                    {parseInt(price) > 0 && (
                      <p className="mt-1 text-base font-bold text-[#C41E1E]">
                        {formatPrice(parseInt(price))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">상품명 *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="상품명을 입력하세요" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">가격</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">카테고리 *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E] bg-white">
              <option value="">선택하세요</option>
              {OWN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">상품 이미지 URL {mode === "url" && <span className="text-[10px] text-gray-400">(자동 가져오기로 채워짐)</span>}</label>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">큐레이션 코멘트</label>
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="이 상품을 추천하는 이유를 한 줄로" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-gray-400">
            판매는 원본 쇼핑몰에서 이루어집니다. 팬이 링크를 클릭하면 해당 페이지로 이동해요.
          </p>
          <button onClick={handleSubmit} disabled={!name.trim()} className="cursor-pointer rounded-lg bg-[#C41E1E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-40 disabled:cursor-default">
            PICK 추가
          </button>
        </div>
      </div>

      {/* 등록된 내 상품 */}
      {ownPicks.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">내 직접 상품 <span className="text-[#C41E1E]">{ownPicks.length}</span></h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ownPicks.map((pick) => (
              <div key={pick.id} className={`overflow-hidden rounded-xl border transition-colors ${pick.visible ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
                <div className="relative aspect-square bg-gray-100">
                  {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">{IMAGE_PLACEHOLDER}</div>}
                  <span className="absolute left-2 top-2 rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-medium text-white">직접</span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">{pick.name}</p>
                  {pick.price > 0 && <p className="mt-1 text-base font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>}
                  <div className="mt-1.5 flex gap-3 text-[11px] text-gray-500">
                    <span>클릭 <b className="text-gray-900">{pick.clicks}</b></span><span>전환 <b className="text-gray-900">{pick.conversions}</b></span>
                  </div>
                  {editingId === pick.id ? (
                    <div className="mt-2 flex gap-1.5">
                      <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="코멘트"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#C41E1E]"
                        onKeyDown={(e) => { if (e.key === "Enter") { onEditComment(pick.id, commentDraft); setEditingId(null); } }} />
                      <button onClick={() => { onEditComment(pick.id, commentDraft); setEditingId(null); }} className="cursor-pointer rounded bg-[#C41E1E] px-2 py-1 text-[10px] text-white">저장</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(pick.id); setCommentDraft(pick.curation_comment); }}
                      className="mt-2 block w-full text-left text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer">
                      {pick.curation_comment ? <span className="italic">&ldquo;{pick.curation_comment}&rdquo;</span> : <span className="text-gray-400">+ 코멘트 추가</span>}
                    </button>
                  )}
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => onToggleVisible(pick.id)} className={`flex-1 cursor-pointer rounded py-1.5 text-[11px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{pick.visible ? "노출" : "숨김"}</button>
                    <button onClick={() => onRemovePick(pick.id)} className="flex-1 cursor-pointer rounded border border-gray-200 py-1.5 text-[11px] font-medium text-gray-400 hover:text-red-500">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 전체 보기 (리스트 뷰)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AllPicksList({
  picks, onToggleVisible, onRemovePick, onEditComment, onMoveUp, onMoveDown,
}: {
  picks: PickItem[]; onToggleVisible: (id: string) => void; onRemovePick: (id: string) => void; onEditComment: (id: string, comment: string) => void; onMoveUp: (id: string) => void; onMoveDown: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  if (picks.length === 0) {
    return (<div className="flex flex-col items-center py-16 text-center"><p className="text-sm font-medium text-gray-900">아직 PICK이 없습니다</p><p className="mt-1 text-xs text-gray-500">각 탭에서 상품을 추가해보세요</p></div>);
  }

  return (
    <div className="space-y-3">
      {picks.map((pick, idx) => (
        <div key={pick.id} className={`rounded-xl border p-4 transition-colors ${pick.visible ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-60"}`}>
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceBadgeStyle(pick.source_type)}`}>{sourceLabel(pick.source_type)}</span>
                {pick.category && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{pick.category}</span>}
                {pick.external_url && <a href={pick.external_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-[#C41E1E]">링크 →</a>}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{pick.name}</h3>
              {pick.price > 0 && <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>}
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>클릭 <span className="font-medium text-gray-900">{pick.clicks}</span></span>
                <span>전환 <span className="font-medium text-gray-900">{pick.conversions}</span></span>
                {pick.revenue > 0 && <span>수익 <span className="font-medium text-[#C41E1E]">{formatPrice(pick.revenue)}</span></span>}
              </div>
              {editingId === pick.id ? (
                <div className="mt-2 flex gap-2">
                  <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="큐레이션 코멘트 입력"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#C41E1E]"
                    onKeyDown={(e) => { if (e.key === "Enter") { onEditComment(pick.id, commentDraft); setEditingId(null); } }} />
                  <button onClick={() => { onEditComment(pick.id, commentDraft); setEditingId(null); }} className="cursor-pointer rounded bg-[#C41E1E] px-3 py-1 text-xs font-medium text-white hover:bg-[#A01818]">저장</button>
                </div>
              ) : (
                <button onClick={() => { setEditingId(pick.id); setCommentDraft(pick.curation_comment); }} className="mt-2 block text-left text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
                  {pick.curation_comment ? <span className="italic">&ldquo;{pick.curation_comment}&rdquo;</span> : <span className="text-gray-400">+ 큐레이션 코멘트 추가</span>}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                <button onClick={() => onMoveUp(pick.id)} disabled={idx === 0} className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => onMoveDown(pick.id)} disabled={idx === picks.length - 1} className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <button onClick={() => onToggleVisible(pick.id)} className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{pick.visible ? "노출" : "숨김"}</button>
              <button onClick={() => onRemovePick(pick.id)} className="cursor-pointer rounded px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-red-500">삭제</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MyPicks() {
  const [picks, setPicks] = useState<PickItem[]>(FALLBACK_PICKS);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isDbConnected, setIsDbConnected] = useState(false);

  const loadPicks = useCallback(async () => {
    try {
      const res = await fetch("/api/picks");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length >= 0) {
          setIsDbConnected(true);
          if (data.length > 0) {
            const mapped: PickItem[] = data.map((d: Record<string, unknown>) => ({
              id: d.id as string, source_type: (d.source_type as SourceType) || "tubeping_campaign",
              product_id: d.product_id as string | null, external_url: d.external_url as string | null,
              affiliate_code: d.affiliate_code as string | null, source_meta: (d.source_meta as Record<string, unknown>) || {},
              display_order: (d.display_order as number) || 0, visible: d.visible !== false,
              curation_comment: (d.curation_comment as string) || "", clicks: (d.clicks as number) || 0, conversions: (d.conversions as number) || 0,
              name: ((d.source_meta as Record<string, unknown>)?.name as string) || ((d as Record<string, unknown> & { products?: { product_name?: string } }).products?.product_name) || "상품명 없음",
              category: (d.source_meta as Record<string, unknown>)?.category as string || "",
              price: (d.source_meta as Record<string, unknown>)?.price as number || 0,
              image: (d.source_meta as Record<string, unknown>)?.image as string | null || null, revenue: 0,
            }));
            setPicks(mapped);
          }
        }
      }
    } catch { /* fallback */ }
  }, []);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const apiPatch = async (id: string, updates: Record<string, unknown>) => {
    if (!isDbConnected) return;
    await fetch("/api/picks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
  };

  const toggleVisible = (id: string) => {
    setPicks((prev) => prev.map((p) => { if (p.id !== id) return p; const next = { ...p, visible: !p.visible }; apiPatch(id, { visible: next.visible }); return next; }));
  };

  const moveUp = (id: string) => {
    setPicks((prev) => { const idx = prev.findIndex((p) => p.id === id); if (idx <= 0) return prev; const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; apiPatch(next[idx - 1].id, { display_order: idx - 1 }); apiPatch(next[idx].id, { display_order: idx }); return next; });
  };

  const moveDown = (id: string) => {
    setPicks((prev) => { const idx = prev.findIndex((p) => p.id === id); if (idx === -1 || idx >= prev.length - 1) return prev; const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; apiPatch(next[idx].id, { display_order: idx }); apiPatch(next[idx + 1].id, { display_order: idx + 1 }); return next; });
  };

  const editComment = (id: string, comment: string) => {
    setPicks((prev) => prev.map((p) => (p.id === id ? { ...p, curation_comment: comment } : p)));
    apiPatch(id, { curation_comment: comment });
  };

  const removePick = async (id: string) => {
    setPicks((prev) => prev.filter((p) => p.id !== id));
    if (isDbConnected) await fetch(`/api/picks?id=${id}`, { method: "DELETE" });
  };

  const addPick = async (partial: Partial<PickItem>) => {
    const newPick: PickItem = {
      id: "temp-" + Date.now(), source_type: partial.source_type || "own", product_id: null,
      external_url: partial.external_url || null, affiliate_code: partial.affiliate_code || null,
      source_meta: { ...(partial.source_meta || {}), name: partial.name, category: partial.category, price: partial.price, image: partial.image },
      display_order: picks.length, visible: true, curation_comment: partial.curation_comment || "",
      clicks: 0, conversions: 0, name: partial.name || "", category: partial.category || "", price: partial.price || 0, image: partial.image || null, revenue: 0,
    };
    setPicks((prev) => [...prev, newPick]);
    if (isDbConnected) {
      try {
        const res = await fetch("/api/picks", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_type: newPick.source_type, external_url: newPick.external_url, affiliate_code: newPick.affiliate_code, curation_comment: newPick.curation_comment, source_meta: newPick.source_meta }) });
        if (res.ok) { const saved = await res.json(); setPicks((prev) => prev.map((p) => (p.id === newPick.id ? { ...newPick, id: saved.id } : p))); }
      } catch { /* local fallback */ }
    }
  };

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "전체", count: picks.length },
    { key: "tubeping_campaign", label: "공구", count: picks.filter((p) => p.source_type === "tubeping_campaign").length },
    { key: "coupang", label: "쿠팡", count: picks.filter((p) => p.source_type === "coupang").length },
    { key: "naver", label: "네이버", count: picks.filter((p) => p.source_type === "naver").length },
  ];

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">내 PICK</h2>
        <p className="mt-1 text-sm text-gray-500">
          여러 소스에서 모은 추천 상품의 큐레이션 아카이브
          {!isDbConnected && <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">더미 데이터</span>}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filter === "all" && <AllPicksList picks={picks} onToggleVisible={toggleVisible} onRemovePick={removePick} onEditComment={editComment} onMoveUp={moveUp} onMoveDown={moveDown} />}
      {filter === "tubeping_campaign" && <GongguTab picks={picks} onAddPick={addPick} onRemovePick={removePick} onToggleVisible={toggleVisible} onEditComment={editComment} />}
      {filter === "coupang" && <CoupangTab picks={picks} onAddPick={addPick} onRemovePick={removePick} onToggleVisible={toggleVisible} />}
      {filter === "naver" && <NaverTab picks={picks} onAddPick={addPick} onRemovePick={removePick} onToggleVisible={toggleVisible} />}
    </div>
  );
}
