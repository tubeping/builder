"use client";

import { useState, useEffect, useCallback } from "react";
import ProductEditor from "./_components/product-editor";

/* ══════════════════════════════════════════
   타입
   ══════════════════════════════════════════ */

type Cafe24Product = {
  product_no: number;
  product_code: string;
  product_name: string;
  price: string;
  supply_price: string;
  retail_price: string;
  detail_image: string;
  list_image: string;
  small_image: string;
  selling: string;
  sold_out: string;
  created_date: string;
  updated_date: string;
};

type Category = { id: number; name: string };

type SyncStatus = "synced" | "pending" | "error" | "none";

type YoutuberStore = {
  id: string;
  name: string;
  channel: string;
  subscribers: number;
  cafe24MallId: string;
  storeUrl: string;
  status: "active" | "building" | "paused";
  assignedProducts: number[];
  syncStatus: Record<number, SyncStatus>;
  lastSyncAt: string | null;
};

/* ══════════════════════════════════════════
   유튜버 카페24 스토어 데이터 (추후 DB)
   ══════════════════════════════════════════ */

const INITIAL_STORES: YoutuberStore[] = [
  { id: "yt01", name: "코믹마트", channel: "@comicmart", subscribers: 1000000, cafe24MallId: "comicmart", storeUrl: "www.comicmart.kr", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: "2026-04-02 14:30" },
  { id: "yt02", name: "E트렌드", channel: "@E_TREND", subscribers: 720000, cafe24MallId: "etrendmall", storeUrl: "www.etrendmall.com", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: "2026-04-01 09:15" },
  { id: "yt03", name: "떠먹여주는TV", channel: "@scoopfeedTV", subscribers: 670000, cafe24MallId: "scoopmarket", storeUrl: "scoopmarket.co.kr", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: "2026-03-30 16:00" },
  { id: "yt04", name: "킬링타임", channel: "@killingtime", subscribers: 550000, cafe24MallId: "killingtime", storeUrl: "www.killingtime.kr", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: "2026-04-01 11:20" },
  { id: "yt05", name: "줌인센타", channel: "@zOOm.in.center", subscribers: 500000, cafe24MallId: "zoomcen", storeUrl: "www.zoomcen.store", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: null },
  { id: "yt06", name: "누기", channel: "@gnooq", subscribers: 300000, cafe24MallId: "gnooq", storeUrl: "www.gnooq.com", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: "2026-03-28 10:00" },
  { id: "yt07", name: "희예", channel: "@heeyea", subscribers: 210000, cafe24MallId: "heeyea", storeUrl: "www.희예스토어.shop", status: "active", assignedProducts: [], syncStatus: {}, lastSyncAt: null },
  { id: "yt08", name: "신사임당", channel: "@shinsaimdang", subscribers: 2700000, cafe24MallId: "shinsaimdang", storeUrl: "(구축 중)", status: "building", assignedProducts: [], syncStatus: {}, lastSyncAt: null },
];

/* ══════════════════════════════════════════
   유틸
   ══════════════════════════════════════════ */

function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
}

function formatPrice(s: string): string {
  const n = Number(s);
  if (isNaN(n)) return s;
  return `₩${n.toLocaleString()}`;
}

function marginRate(price: string, supply: string): string {
  const p = Number(price);
  const s = Number(supply);
  if (!p || !s || p <= 0) return "-";
  return `${(((p - s) / p) * 100).toFixed(1)}%`;
}

function marginNum(price: string, supply: string): number {
  const p = Number(price);
  const s = Number(supply);
  if (!p || !s || p <= 0) return 0;
  return ((p - s) / p) * 100;
}

const STORE_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "운영중", cls: "bg-green-100 text-green-700" },
  building: { label: "구축중", cls: "bg-blue-100 text-blue-700" },
  paused: { label: "중지", cls: "bg-gray-100 text-gray-500" },
};

const SYNC_STATUS: Record<SyncStatus, { label: string; cls: string }> = {
  synced: { label: "동기화됨", cls: "bg-green-100 text-green-700" },
  pending: { label: "대기중", cls: "bg-yellow-100 text-yellow-700" },
  error: { label: "오류", cls: "bg-red-100 text-red-700" },
  none: { label: "미동기화", cls: "bg-gray-100 text-gray-500" },
};

/* ══════════════════════════════════════════
   탭 정의
   ══════════════════════════════════════════ */

const TABS = [
  { key: "inventory", label: "인벤토리", desc: "카페24 마스터 상품" },
  { key: "stores", label: "유튜버 스토어", desc: "스토어별 배정/동기화" },
  { key: "overview", label: "현황", desc: "전체 통계" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ══════════════════════════════════════════
   메인 컴포넌트
   ══════════════════════════════════════════ */

export default function ProductsPage() {
  const [tab, setTab] = useState<TabKey>("inventory");
  const [products, setProducts] = useState<Cafe24Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stores, setStores] = useState<YoutuberStore[]>(INITIAL_STORES);

  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [editingProductNo, setEditingProductNo] = useState<number | null>(null);

  /* ── 카페24 상품 불러오기 ── */
  const fetchProducts = useCallback(async (reset = false) => {
    setLoading(true);
    setError("");
    const newOffset = reset ? 0 : offset;
    const params = new URLSearchParams({ limit: "50", offset: String(newOffset) });
    if (keyword) params.set("keyword", keyword);
    if (catFilter) params.set("category", catFilter);

    try {
      const res = await fetch(`/api/cafe24/products?${params}`);
      if (!res.ok) throw new Error(`API 오류 (${res.status})`);
      const data = await res.json();
      const fetched: Cafe24Product[] = data.products || [];
      if (reset) {
        setProducts(fetched);
        setOffset(fetched.length);
      } else {
        setProducts((prev) => [...prev, ...fetched]);
        setOffset(newOffset + fetched.length);
      }
      setHasMore(fetched.length >= 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [offset, keyword, catFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe24/categories");
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchProducts(true);
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setOffset(0);
    fetchProducts(true);
  };

  /* ── 배정 / 해제 로직 ── */
  const toggleSelect = (no: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedProducts.size === products.length) setSelectedProducts(new Set());
    else setSelectedProducts(new Set(products.map((p) => p.product_no)));
  };

  const assignToStore = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id !== storeId) return s;
        const merged = new Set([...s.assignedProducts, ...selectedProducts]);
        const newSync = { ...s.syncStatus };
        selectedProducts.forEach((pNo) => { newSync[pNo] = "pending"; });
        return { ...s, assignedProducts: Array.from(merged), syncStatus: newSync };
      })
    );
    setSelectedProducts(new Set());
    setShowAssignDropdown(false);
  };

  const assignToAll = () => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.status !== "active") return s;
        const merged = new Set([...s.assignedProducts, ...selectedProducts]);
        const newSync = { ...s.syncStatus };
        selectedProducts.forEach((pNo) => { newSync[pNo] = "pending"; });
        return { ...s, assignedProducts: Array.from(merged), syncStatus: newSync };
      })
    );
    setSelectedProducts(new Set());
    setShowAssignDropdown(false);
  };

  const unassign = (storeId: string, productNo: number) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id !== storeId) return s;
        const newSync = { ...s.syncStatus };
        delete newSync[productNo];
        return { ...s, assignedProducts: s.assignedProducts.filter((p) => p !== productNo), syncStatus: newSync };
      })
    );
  };

  const unassignAll = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, assignedProducts: [], syncStatus: {} } : s))
    );
  };

  const syncStore = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id !== storeId) return s;
        const newSync: Record<number, SyncStatus> = {};
        s.assignedProducts.forEach((pNo) => { newSync[pNo] = "synced"; });
        return { ...s, syncStatus: newSync, lastSyncAt: new Date().toISOString().replace("T", " ").slice(0, 16) };
      })
    );
  };

  const getProductByNo = (no: number) => products.find((p) => p.product_no === no);

  const activeStores = stores.filter((s) => s.status === "active");
  const totalAssigned = stores.reduce((sum, s) => sum + s.assignedProducts.length, 0);
  const allAssignedSet = new Set(stores.flatMap((s) => s.assignedProducts));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            카페24 마스터 인벤토리 → 유튜버 카페24 스토어 동기화
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700 font-medium">마스터: shinsana</span>
          </div>
          <span className="text-xs text-gray-400">{activeStores.length}개 스토어 연결</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">마스터 인벤토리</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{products.length}<span className="text-sm font-normal text-gray-400">+</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">유튜버 스토어</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeStores.length}<span className="text-sm font-normal text-gray-400">/{stores.length}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">배정된 상품</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{allAssignedSet.size}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">총 배정 건수</p>
          <p className="text-2xl font-bold text-[#C41E1E] mt-1">{totalAssigned}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">미배정 상품</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{products.length - allAssignedSet.size}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer rounded-t-lg ${
              tab === t.key
                ? "text-[#C41E1E] bg-white border border-gray-200 border-b-white -mb-px"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 인벤토리 탭 ─── */}
      {tab === "inventory" && (
        <div className="space-y-4">
          {/* 검색 + 배정 */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="상품명 검색..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-72 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            />
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="">전체 카테고리</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] cursor-pointer"
            >
              검색
            </button>

            <div className="flex-1" />

            {selectedProducts.size > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  className="px-5 py-2.5 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-gray-800 cursor-pointer"
                >
                  {selectedProducts.size}개 → 스토어 배정
                </button>

                {showAssignDropdown && (
                  <div className="absolute right-0 top-12 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-2 max-h-[400px] overflow-y-auto">
                    <p className="px-4 py-2 text-xs text-gray-500 font-semibold border-b border-gray-100 mb-1">
                      배정할 카페24 스토어 선택
                    </p>
                    {stores.filter((s) => s.status === "active").map((s) => (
                      <button
                        key={s.id}
                        onClick={() => assignToStore(s.id)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.cafe24MallId}.cafe24.com · {s.assignedProducts.length}개</p>
                        </div>
                        <span className="text-xs text-[#C41E1E] font-bold">+{selectedProducts.size}</span>
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={assignToAll}
                        className="w-full px-4 py-2.5 text-left hover:bg-[#FFF0F5] cursor-pointer"
                      >
                        <p className="text-sm font-bold text-[#C41E1E]">전체 스토어에 배정</p>
                        <p className="text-[10px] text-gray-400">{activeStores.length}개 활성 스토어</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>
          )}

          {/* 상품 테이블 */}
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size > 0 && selectedProducts.size === products.length}
                      onChange={selectAll}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-3 py-3 font-medium w-14">이미지</th>
                  <th className="text-left px-3 py-3 font-medium">상품명</th>
                  <th className="text-left px-3 py-3 font-medium">코드</th>
                  <th className="text-right px-3 py-3 font-medium">판매가</th>
                  <th className="text-right px-3 py-3 font-medium">공급가</th>
                  <th className="text-right px-3 py-3 font-medium">마진</th>
                  <th className="text-center px-3 py-3 font-medium">상태</th>
                  <th className="text-center px-4 py-3 font-medium">스토어 배정</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isSelected = selectedProducts.has(p.product_no);
                  const assignedStores = stores.filter((s) => s.assignedProducts.includes(p.product_no));
                  const img = p.list_image || p.detail_image || p.small_image;
                  const mr = marginNum(p.price, p.supply_price);

                  return (
                    <tr
                      key={p.product_no}
                      className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${isSelected ? "bg-[#FFF0F5]/40" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.product_no)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {img ? (
                          <img src={img} alt="" className="w-11 h-11 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">없음</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setEditingProductNo(p.product_no)}
                          className="text-sm font-medium text-gray-900 hover:text-[#C41E1E] text-left cursor-pointer line-clamp-2 max-w-[260px]"
                        >
                          {p.product_name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{p.product_code}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-900 text-right font-medium">{formatPrice(p.price)}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500 text-right">{formatPrice(p.supply_price)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-sm font-medium ${mr >= 30 ? "text-green-600" : mr >= 20 ? "text-blue-600" : "text-gray-500"}`}>
                          {marginRate(p.price, p.supply_price)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {p.sold_out === "T" ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">품절</span>
                        ) : p.selling === "T" ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">판매중</span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">미판매</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {assignedStores.length > 0 ? (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {assignedStores.slice(0, 3).map((s) => (
                              <span key={s.id} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFF0F5] text-[#C41E1E] font-medium whitespace-nowrap">
                                {s.name}
                              </span>
                            ))}
                            {assignedStores.length > 3 && (
                              <span className="text-[9px] text-gray-400">+{assignedStores.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">미배정</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{products.length}개 로드됨</span>
              <div className="flex items-center gap-3">
                {loading && <span className="text-xs text-gray-400">로딩 중...</span>}
                {hasMore && !loading && (
                  <button
                    onClick={() => fetchProducts(false)}
                    className="px-4 py-2 text-sm text-[#C41E1E] font-medium border border-[#C41E1E]/30 rounded-lg hover:bg-[#FFF0F5] cursor-pointer"
                  >
                    더 불러오기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 유튜버 스토어 탭 ─── */}
      {tab === "stores" && (
        <StoresTab
          stores={stores}
          getProductByNo={getProductByNo}
          unassign={unassign}
          unassignAll={unassignAll}
          syncStore={syncStore}
        />
      )}

      {/* ─── 현황 탭 ─── */}
      {tab === "overview" && (
        <OverviewTab
          stores={stores}
          products={products}
          getProductByNo={getProductByNo}
        />
      )}

      {/* 상품 편집 패널 */}
      {editingProductNo && (
        <ProductEditor
          productNo={editingProductNo}
          onClose={() => setEditingProductNo(null)}
          onSaved={() => fetchProducts(true)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   유튜버 스토어 탭
   ══════════════════════════════════════════ */

function StoresTab({
  stores, getProductByNo, unassign, unassignAll, syncStore,
}: {
  stores: YoutuberStore[];
  getProductByNo: (no: number) => Cafe24Product | undefined;
  unassign: (storeId: string, productNo: number) => void;
  unassignAll: (storeId: string) => void;
  syncStore: (storeId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        각 유튜버의 카페24 스토어에 배정된 상품을 관리합니다. 동기화하면 해당 스토어에 자동 반영됩니다.
      </p>

      {stores.map((store) => {
        const isExpanded = expandedId === store.id;
        const pendingCount = store.assignedProducts.filter((pNo) => store.syncStatus[pNo] === "pending").length;
        const syncedCount = store.assignedProducts.filter((pNo) => store.syncStatus[pNo] === "synced").length;

        return (
          <div key={store.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div
              onClick={() => setExpandedId(isExpanded ? null : store.id)}
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#C41E1E] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{store.name.slice(0, 2)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{store.name}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STORE_STATUS[store.status].cls}`}>
                      {STORE_STATUS[store.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{store.channel}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">구독 {formatNumber(store.subscribers)}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-blue-500 font-mono">{store.cafe24MallId}.cafe24.com</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{store.assignedProducts.length}</p>
                  <p className="text-[10px] text-gray-400">배정 상품</p>
                </div>
                <div className="text-right min-w-[80px]">
                  {pendingCount > 0 ? (
                    <>
                      <p className="text-sm font-bold text-yellow-600">{pendingCount}개 대기</p>
                      <p className="text-[10px] text-gray-400">동기화 필요</p>
                    </>
                  ) : syncedCount > 0 ? (
                    <>
                      <p className="text-sm font-bold text-green-600">동기화됨</p>
                      <p className="text-[10px] text-gray-400">{store.lastSyncAt?.split(" ")[0] || ""}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">-</p>
                  )}
                </div>
                {store.status === "active" && pendingCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); syncStore(store.id); }}
                    className="px-4 py-2 bg-[#C41E1E] text-white text-xs font-medium rounded-lg hover:bg-[#A01818] cursor-pointer"
                  >
                    동기화
                  </button>
                )}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {store.assignedProducts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    배정된 상품이 없습니다. 인벤토리 탭에서 상품을 선택하여 배정하세요.
                  </div>
                ) : (
                  <>
                    <div className="px-6 py-2 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">{store.assignedProducts.length}개 상품</span>
                        {pendingCount > 0 && (
                          <span className="text-xs text-yellow-600 font-medium">{pendingCount}개 동기화 대기</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {pendingCount > 0 && (
                          <button
                            onClick={() => syncStore(store.id)}
                            className="text-xs text-[#C41E1E] hover:text-[#A01818] font-medium cursor-pointer"
                          >
                            전체 동기화
                          </button>
                        )}
                        <button
                          onClick={() => unassignAll(store.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                        >
                          전체 해제
                        </button>
                      </div>
                    </div>

                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] text-gray-400 border-b border-gray-50">
                          <th className="text-left px-6 py-2 font-medium">상품</th>
                          <th className="text-right px-3 py-2 font-medium">판매가</th>
                          <th className="text-right px-3 py-2 font-medium">마진</th>
                          <th className="text-center px-3 py-2 font-medium">동기화</th>
                          <th className="text-center px-6 py-2 font-medium">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.assignedProducts.map((pNo) => {
                          const p = getProductByNo(pNo);
                          const ss = store.syncStatus[pNo] || "none";
                          return (
                            <tr key={pNo} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                              <td className="px-6 py-2.5">
                                <div className="flex items-center gap-3">
                                  {p?.list_image ? (
                                    <img src={p.list_image} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-gray-100" />
                                  )}
                                  <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[250px]">
                                    {p?.product_name || `#${pNo}`}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-sm text-gray-700 text-right">
                                {p ? formatPrice(p.price) : "-"}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <span className={`text-sm font-medium ${
                                  p && marginNum(p.price, p.supply_price) >= 30 ? "text-green-600" : "text-gray-500"
                                }`}>
                                  {p ? marginRate(p.price, p.supply_price) : "-"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SYNC_STATUS[ss].cls}`}>
                                  {SYNC_STATUS[ss].label}
                                </span>
                              </td>
                              <td className="px-6 py-2.5 text-center">
                                <button
                                  onClick={() => unassign(store.id, pNo)}
                                  className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
                                >
                                  해제
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   현황 탭
   ══════════════════════════════════════════ */

function OverviewTab({
  stores, products, getProductByNo,
}: {
  stores: YoutuberStore[];
  products: Cafe24Product[];
  getProductByNo: (no: number) => Cafe24Product | undefined;
}) {
  const allAssigned = new Set(stores.flatMap((s) => s.assignedProducts));
  const unassignedCount = products.filter((p) => !allAssigned.has(p.product_no)).length;
  const totalPending = stores.reduce((sum, s) =>
    sum + s.assignedProducts.filter((pNo) => s.syncStatus[pNo] === "pending").length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "인벤토리", value: products.length, color: "text-gray-900" },
          { label: "배정 완료", value: allAssigned.size, color: "text-green-600" },
          { label: "미배정", value: unassignedCount, color: "text-orange-500" },
          { label: "전체 스토어", value: stores.length, color: "text-gray-900" },
          { label: "총 배정 건수", value: stores.reduce((s, st) => s + st.assignedProducts.length, 0), color: "text-[#C41E1E]" },
          { label: "동기화 대기", value: totalPending, color: totalPending > 0 ? "text-yellow-600" : "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">유튜버 스토어별 현황</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium">스토어</th>
              <th className="text-left px-3 py-3 font-medium">카페24 ID</th>
              <th className="text-right px-3 py-3 font-medium">구독자</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-right px-3 py-3 font-medium">배정 상품</th>
              <th className="text-right px-3 py-3 font-medium">동기화됨</th>
              <th className="text-right px-3 py-3 font-medium">대기중</th>
              <th className="text-right px-3 py-3 font-medium">평균 마진</th>
              <th className="text-right px-6 py-3 font-medium">마지막 동기화</th>
            </tr>
          </thead>
          <tbody>
            {stores
              .sort((a, b) => b.assignedProducts.length - a.assignedProducts.length)
              .map((store) => {
                const assignedP = store.assignedProducts.map(getProductByNo).filter(Boolean) as Cafe24Product[];
                const avgMargin = assignedP.length > 0
                  ? assignedP.reduce((sum, p) => sum + marginNum(p.price, p.supply_price), 0) / assignedP.length
                  : 0;
                const syncedCount = store.assignedProducts.filter((pNo) => store.syncStatus[pNo] === "synced").length;
                const pendingCount = store.assignedProducts.filter((pNo) => store.syncStatus[pNo] === "pending").length;

                return (
                  <tr key={store.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-400">{store.channel}</p>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-blue-500 font-mono">{store.cafe24MallId}</td>
                    <td className="px-3 py-3.5 text-sm text-gray-700 text-right">{formatNumber(store.subscribers)}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STORE_STATUS[store.status].cls}`}>
                        {STORE_STATUS[store.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-sm font-bold text-gray-900 text-right">{store.assignedProducts.length}</td>
                    <td className="px-3 py-3.5 text-sm text-green-600 text-right">{syncedCount}</td>
                    <td className="px-3 py-3.5 text-right">
                      {pendingCount > 0 ? (
                        <span className="text-sm font-medium text-yellow-600">{pendingCount}</span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span className={`text-sm font-medium ${avgMargin >= 30 ? "text-green-600" : avgMargin >= 20 ? "text-blue-600" : "text-gray-500"}`}>
                        {avgMargin > 0 ? `${avgMargin.toFixed(1)}%` : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-500 text-right">
                      {store.lastSyncAt || "-"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#FFF0F5] rounded-xl border border-[#C41E1E]/10 p-6">
        <h3 className="text-sm font-bold text-[#C41E1E] mb-3">운영 흐름</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { step: "1", title: "카페24 인벤토리", desc: "shinsana 마스터 몰에서 상품 등록/수정/가격/재고 관리" },
            { step: "2", title: "상품 배정", desc: "인벤토리에서 상품 선택 → 유튜버 스토어에 배정" },
            { step: "3", title: "동기화", desc: "배정된 상품을 유튜버 카페24 스토어에 자동 동기화" },
            { step: "4", title: "관리 끝", desc: "가격/재고 변경은 마스터에서만. 동기화하면 전체 반영" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-8 h-8 rounded-full bg-[#C41E1E] text-white font-bold text-sm flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
