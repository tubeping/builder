"use client";

import { useState, useEffect, useCallback } from "react";

// ─── 쿠팡 검색 더미 데이터 ───
const COUPANG_SEARCH_RESULTS: CoupangSearchProduct[] = [
  { id: "cp1", name: "캠핑 의자 경량 접이식 체어 낚시 야외", price: 29900, image: null, rating: 4.7, reviewCount: 12453, commission: 3, rank: 1 },
  { id: "cp2", name: "캠핑 의자 릴렉스 체어 하이백 접이식", price: 45900, image: null, rating: 4.8, reviewCount: 8921, commission: 3, rank: 2 },
  { id: "cp3", name: "캠핑 의자 2개세트 접이식 경량 야외", price: 39800, image: null, rating: 4.5, reviewCount: 6234, commission: 3, rank: 3 },
  { id: "cp4", name: "캠핑 의자 우드 원목 접이식 감성캠핑", price: 68900, image: null, rating: 4.9, reviewCount: 3456, commission: 3, rank: 4 },
  { id: "cp5", name: "캠핑 의자 1+1 초경량 백패킹 체어", price: 24900, image: null, rating: 4.3, reviewCount: 15678, commission: 3, rank: 5 },
  { id: "cp6", name: "캠핑 의자 로우체어 그라운드 좌식", price: 32900, image: null, rating: 4.6, reviewCount: 4567, commission: 3, rank: 6 },
  { id: "cp7", name: "캠핑 의자 대형 빅사이즈 접이식 150kg", price: 54900, image: null, rating: 4.4, reviewCount: 2345, commission: 3, rank: 7 },
  { id: "cp8", name: "캠핑 의자 커플세트 2인용 벤치형", price: 79900, image: null, rating: 4.7, reviewCount: 1890, commission: 3, rank: 8 },
];

const NAVER_DUMMY_PRODUCT = {
  name: "오설록 제주 녹차 선물세트",
  price: 35000,
};

const REQUEST_HISTORY = [
  { id: 1, name: "나이키 에어맥스 97", date: "2026-03-28", status: "검토 중" as const },
  { id: 2, name: "다이슨 에어랩", date: "2026-03-25", status: "소싱 완료" as const },
  { id: 3, name: "아이패드 프로 M4", date: "2026-03-20", status: "소싱 불가" as const },
];

// ─── 타입 ───
type Tab = "cafe24" | "coupang" | "naver" | "request";
type RequestStatus = "검토 중" | "소싱 완료" | "소싱 불가";

interface CoupangSearchProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
  rating: number;
  reviewCount: number;
  commission: number;
  rank: number;
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
}

interface NaverProduct {
  name: string;
  price: number;
}

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

const IMAGE_PLACEHOLDER = (
  <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IMAGE_PLACEHOLDER_SM = (
  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IMAGE_PLACEHOLDER_XS = (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DELETE_ICON = (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── 메인 컴포넌트 ───
export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState<Tab>("cafe24");

  // 카페24 상태
  const [cafe24Products, setCafe24Products] = useState<Cafe24Product[]>([]);
  const [cafe24Loading, setCafe24Loading] = useState(false);
  const [cafe24LoadingMore, setCafe24LoadingMore] = useState(false);
  const [cafe24Error, setCafe24Error] = useState("");
  const [cafe24Search, setCafe24Search] = useState("");
  const [cafe24AddedIds, setCafe24AddedIds] = useState<Set<number>>(new Set());
  const [cafe24Loaded, setCafe24Loaded] = useState(false);
  const [cafe24HasMore, setCafe24HasMore] = useState(false);
  const [cafe24Offset, setCafe24Offset] = useState(0);
  const [cafe24Categories, setCafe24Categories] = useState<{ id: number; name: string }[]>([]);
  const [cafe24SelectedCategory, setCafe24SelectedCategory] = useState<number | null>(null);
  const [cafe24Total, setCafe24Total] = useState(0);

  const CAFE24_PAGE_SIZE = 40;

  const fetchCafe24Categories = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe24/categories");
      if (!res.ok) return;
      const data = await res.json();
      setCafe24Categories(data.categories || []);
    } catch { /* ignore */ }
  }, []);

  const fetchCafe24Products = useCallback(async (opts?: { keyword?: string; category?: number | null; append?: boolean }) => {
    const isAppend = opts?.append || false;
    if (isAppend) setCafe24LoadingMore(true);
    else setCafe24Loading(true);
    setCafe24Error("");
    try {
      const nextOffset = isAppend ? cafe24Offset + CAFE24_PAGE_SIZE : 0;
      const params = new URLSearchParams({ limit: String(CAFE24_PAGE_SIZE), offset: String(isAppend ? nextOffset : 0) });
      if (opts?.keyword?.trim()) params.set("keyword", opts.keyword.trim());
      const cat = opts?.category !== undefined ? opts.category : cafe24SelectedCategory;
      if (cat) params.set("category", String(cat));
      const res = await fetch(`/api/cafe24/products?${params}`);
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      const products = data.products || [];
      if (isAppend) {
        setCafe24Products((prev) => [...prev, ...products]);
        setCafe24Offset(nextOffset);
      } else {
        setCafe24Products(products);
        setCafe24Offset(0);
      }
      setCafe24HasMore(products.length >= CAFE24_PAGE_SIZE);
      setCafe24Total(isAppend ? cafe24Total : products.length);
      setCafe24Loaded(true);
    } catch {
      setCafe24Error("상품을 불러올 수 없습니다. 카페24 연동을 확인해주세요.");
      if (!isAppend) setCafe24Products([]);
    } finally {
      setCafe24Loading(false);
      setCafe24LoadingMore(false);
    }
  }, [cafe24Offset, cafe24SelectedCategory, cafe24Total]);

  useEffect(() => {
    if (activeTab === "cafe24" && !cafe24Loaded) {
      fetchCafe24Products();
      fetchCafe24Categories();
    }
  }, [activeTab, cafe24Loaded, fetchCafe24Products, fetchCafe24Categories]);

  const handleCafe24CategoryChange = (catId: number | null) => {
    setCafe24SelectedCategory(catId);
    setCafe24Loaded(false);
    fetchCafe24Products({ category: catId, keyword: cafe24Search || undefined });
  };

  const handleCafe24Search = () => {
    setCafe24Loaded(false);
    fetchCafe24Products({ keyword: cafe24Search || undefined });
  };

  const toggleCafe24Add = (productNo: number) => {
    setCafe24AddedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productNo)) next.delete(productNo);
      else next.add(productNo);
      return next;
    });
  };

  const filteredCafe24 = cafe24Products;

  // 쿠팡 파트너스 상태
  const [coupangAccessKey, setCoupangAccessKey] = useState("");
  const [coupangSecretKey, setCoupangSecretKey] = useState("");
  const [isCoupangConnected, setIsCoupangConnected] = useState(false);
  const [showCoupangModal, setShowCoupangModal] = useState(false);
  const [coupangSearchQuery, setCoupangSearchQuery] = useState("");
  const [coupangResults, setCoupangResults] = useState<CoupangSearchProduct[]>([]);
  const [coupangHasSearched, setCoupangHasSearched] = useState(false);
  const [coupangSortBy, setCoupangSortBy] = useState<"rank" | "price_low" | "price_high" | "review">("rank");
  const [coupangSelectedProduct, setCoupangSelectedProduct] = useState<CoupangSearchProduct | null>(null);
  const [coupangGeneratedLink, setCoupangGeneratedLink] = useState("");
  const [coupangAdded, setCoupangAdded] = useState<(CoupangSearchProduct & { affiliateLink: string })[]>([]);

  // 네이버/기타 상태
  const [naverUrl, setNaverUrl] = useState("");
  const [naverPreview, setNaverPreview] = useState<NaverProduct | null>(null);
  const [naverAdded, setNaverAdded] = useState<NaverProduct[]>([]);

  // 상품 조르기 상태
  const [requestName, setRequestName] = useState("");
  const [requestLink, setRequestLink] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // ─── 핸들러 ───
  const handleCoupangConnect = () => {
    if (coupangAccessKey.trim() && coupangSecretKey.trim()) {
      setIsCoupangConnected(true);
      setShowCoupangModal(false);
    }
  };

  const handleCoupangReset = () => {
    setIsCoupangConnected(false);
    setCoupangAccessKey("");
    setCoupangSecretKey("");
    setCoupangResults([]);
    setCoupangSearchQuery("");
    setCoupangHasSearched(false);
    setCoupangSelectedProduct(null);
    setCoupangGeneratedLink("");
  };

  const handleCoupangSearch = () => {
    if (!coupangSearchQuery.trim()) return;
    // 더미: 실제로는 쿠팡 파트너스 API 호출
    setCoupangResults(COUPANG_SEARCH_RESULTS);
    setCoupangHasSearched(true);
  };

  const handleCoupangGenerateLink = (product: CoupangSearchProduct) => {
    setCoupangSelectedProduct(product);
    // 더미 어필리에이트 링크 생성
    setCoupangGeneratedLink(`https://link.coupang.com/a/tubeping_${product.id}`);
  };

  const handleCoupangAddProduct = () => {
    if (coupangSelectedProduct && coupangGeneratedLink) {
      setCoupangAdded((prev) => [...prev, { ...coupangSelectedProduct, affiliateLink: coupangGeneratedLink }]);
      setCoupangSelectedProduct(null);
      setCoupangGeneratedLink("");
      setToastMessage("상품이 쇼핑몰에 추가되었습니다!");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const sortedCoupangResults = [...coupangResults].sort((a, b) => {
    switch (coupangSortBy) {
      case "rank": return a.rank - b.rank;
      case "price_low": return a.price - b.price;
      case "price_high": return b.price - a.price;
      case "review": return b.reviewCount - a.reviewCount;
      default: return 0;
    }
  });

  const handleNaverFetch = () => {
    if (naverUrl.trim()) {
      setNaverPreview(NAVER_DUMMY_PRODUCT);
    }
  };

  const handleNaverAdd = () => {
    if (naverPreview) {
      setNaverAdded((prev) => [...prev, naverPreview]);
      setNaverPreview(null);
      setNaverUrl("");
    }
  };

  const handleRequestSubmit = () => {
    if (!requestName.trim() || !requestLink.trim()) return;
    setToastMessage("요청이 성공적으로 전송되었습니다!");
    setRequestName("");
    setRequestLink("");
    setRequestDesc("");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const statusStyle = (status: RequestStatus) => {
    switch (status) {
      case "검토 중":
        return "bg-yellow-100 text-yellow-700";
      case "소싱 완료":
        return "bg-green-100 text-green-700";
      case "소싱 불가":
        return "bg-red-100 text-red-700";
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "cafe24", label: "공구상품" },
    { key: "coupang", label: "쿠팡 파트너스" },
    { key: "naver", label: "네이버·기타" },
    { key: "request", label: "상품 조르기" },
  ];

  return (
    <div className="w-full">
      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* ─── 탭 헤더 ─── */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-3 text-sm cursor-pointer transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[#C41E1E] font-medium text-[#C41E1E]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.key === "cafe24" && cafe24AddedIds.size > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#111111] px-1.5 text-xs text-white">
                  {cafe24AddedIds.size}
                </span>
              )}
              {tab.key === "coupang" && isCoupangConnected && (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ─── 탭 콘텐츠 ─── */}
      <div className="p-5">
        {/* ━━━ 공구상품 (카페24) ━━━ */}
        {activeTab === "cafe24" && (
          <div className="space-y-5">
            {/* 헤더 + 검색 */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">카페24 상품</h3>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연동됨</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>총 {cafe24Products.length}개</span>
                  <button
                    onClick={() => { setCafe24Loaded(false); fetchCafe24Products({ keyword: cafe24Search || undefined }); }}
                    className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    새로고침
                  </button>
                </div>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="상품명으로 검색"
                  value={cafe24Search}
                  onChange={(e) => setCafe24Search(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCafe24Search(); }}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-20 text-sm outline-none focus:border-[#C41E1E]"
                />
                <button
                  onClick={handleCafe24Search}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]"
                >
                  검색
                </button>
              </div>

              {/* 카테고리 필터 */}
              {cafe24Categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleCafe24CategoryChange(null)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
                      cafe24SelectedCategory === null
                        ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]"
                        : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    전체
                  </button>
                  {cafe24Categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCafe24CategoryChange(cat.id)}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
                        cafe24SelectedCategory === cat.id
                          ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]"
                          : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 로딩 */}
            {cafe24Loading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
                  <p className="text-sm text-gray-500">카페24에서 상품을 불러오는 중...</p>
                </div>
              </div>
            )}

            {/* 에러 */}
            {cafe24Error && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <svg className="h-7 w-7 text-[#C41E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">{cafe24Error}</p>
                <button
                  onClick={() => fetchCafe24Products()}
                  className="mt-3 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* 상품 그리드 */}
            {!cafe24Loading && !cafe24Error && filteredCafe24.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {cafe24Search ? `"${cafe24Search}" 검색 결과` : "전체 상품"} · {filteredCafe24.length}개
                  </p>
                  <span className="text-sm text-gray-500">
                    추가됨 <span className="font-medium text-[#C41E1E]">{cafe24AddedIds.size}</span>개
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {filteredCafe24.map((product) => {
                    const isAdded = cafe24AddedIds.has(product.product_no);
                    const price = Number(product.price);
                    const isSoldOut = product.sold_out === "T";
                    return (
                      <div
                        key={product.product_no}
                        className={`overflow-hidden rounded-xl border transition-colors ${
                          isAdded ? "border-[#C41E1E]" : "border-gray-200 hover:border-gray-300"
                        } ${isSoldOut ? "opacity-50" : ""}`}
                      >
                        {/* 이미지 */}
                        <div className="relative aspect-square bg-gray-100">
                          {product.list_image || product.detail_image ? (
                            <img
                              src={product.list_image || product.detail_image}
                              alt={product.product_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">
                              {IMAGE_PLACEHOLDER}
                            </div>
                          )}
                          {isSoldOut && (
                            <span className="absolute left-2 top-2 rounded bg-gray-700 px-2 py-0.5 text-xs font-medium text-white">
                              품절
                            </span>
                          )}
                          {isAdded && (
                            <span className="absolute right-2 top-2 rounded bg-[#C41E1E] px-2 py-0.5 text-xs font-medium text-white">
                              추가됨
                            </span>
                          )}
                        </div>
                        {/* 정보 */}
                        <div className="p-3">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">
                            {product.product_name}
                          </p>
                          <p className="mt-1.5 text-base font-bold text-[#C41E1E]">
                            {formatPrice(price)}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            공급가 {formatPrice(Number(product.supply_price))}
                          </p>
                          <button
                            onClick={() => !isSoldOut && toggleCafe24Add(product.product_no)}
                            disabled={isSoldOut}
                            className={`mt-3 w-full cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                              isSoldOut
                                ? "bg-gray-100 text-gray-400 cursor-default"
                                : isAdded
                                ? "bg-gray-100 text-gray-500"
                                : "bg-[#C41E1E] text-white hover:bg-[#A01818]"
                            }`}
                          >
                            {isSoldOut ? "품절" : isAdded ? "✓ 추가됨" : "내 쇼핑몰에 추가"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 더보기 */}
            {!cafe24Loading && !cafe24Error && cafe24HasMore && filteredCafe24.length > 0 && (
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => fetchCafe24Products({ append: true, keyword: cafe24Search || undefined })}
                  disabled={cafe24LoadingMore}
                  className="cursor-pointer rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {cafe24LoadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
                      불러오는 중...
                    </span>
                  ) : (
                    "더보기"
                  )}
                </button>
              </div>
            )}

            {/* 빈 결과 */}
            {!cafe24Loading && !cafe24Error && filteredCafe24.length === 0 && cafe24Loaded && (
              <div className="flex flex-col items-center py-12 text-center">
                <p className="text-sm text-gray-500">
                  {cafe24Search ? `"${cafe24Search}"에 해당하는 상품이 없습니다` : "등록된 상품이 없습니다"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ━━━ 쿠팡 파트너스 ━━━ */}
        {activeTab === "coupang" && (
          <div className="space-y-5">
            {/* ── 연동 모달 ── */}
            {showCoupangModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                  <h3 className="mb-1 text-center text-base font-semibold text-gray-900">
                    서비스를 이용하려면
                  </h3>
                  <p className="mb-5 text-center text-sm text-gray-500">
                    쿠팡 파트너스 연동이 필요해요
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Access Key"
                      value={coupangAccessKey}
                      onChange={(e) => setCoupangAccessKey(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                    />
                    <input
                      type="password"
                      placeholder="Secret Key"
                      value={coupangSecretKey}
                      onChange={(e) => setCoupangSecretKey(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    <span className="cursor-pointer text-[#C41E1E] hover:underline">
                      쿠팡 파트너스 키 발급받기 →
                    </span>
                  </p>
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setShowCoupangModal(false)}
                      className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      닫기
                    </button>
                    <button
                      onClick={handleCoupangConnect}
                      className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                    >
                      연동하기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 링크 생성 모달 ── */}
            {coupangSelectedProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                  <button
                    onClick={() => { setCoupangSelectedProduct(null); setCoupangGeneratedLink(""); }}
                    className="absolute right-4 top-4 cursor-pointer text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>

                  {/* 상품 정보 */}
                  <div className="mb-4 flex flex-col items-center">
                    <div className="mb-3 flex h-32 w-32 items-center justify-center rounded-xl bg-gray-100 text-gray-300">
                      {IMAGE_PLACEHOLDER}
                    </div>
                    <p className="text-center text-sm font-medium text-gray-900">{coupangSelectedProduct.name}</p>
                    <p className="mt-1 text-lg font-bold text-[#C41E1E]">{formatPrice(coupangSelectedProduct.price)}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      예상 수수료: {formatPrice(Math.round(coupangSelectedProduct.price * coupangSelectedProduct.commission / 100))} ({coupangSelectedProduct.commission}%)
                    </p>
                  </div>

                  {/* 생성된 링크 */}
                  {coupangGeneratedLink && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
                      <span className="text-green-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </span>
                      <span className="flex-1 truncate text-xs text-gray-600">{coupangGeneratedLink}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(coupangGeneratedLink)}
                        className="cursor-pointer text-xs text-[#C41E1E] hover:underline"
                      >
                        복사
                      </button>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="space-y-2">
                    <button
                      onClick={handleCoupangAddProduct}
                      className="w-full cursor-pointer rounded-lg bg-[#C41E1E] py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                    >
                      내 쇼핑몰에 추가
                    </button>
                    <button
                      onClick={() => { setCoupangSelectedProduct(null); setCoupangGeneratedLink(""); }}
                      className="w-full cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 검색 바 ── */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">상품 검색</h3>
                {isCoupangConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연결됨</span>
                    <button onClick={handleCoupangReset} className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">재설정</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCoupangModal(true)}
                    className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
                  >
                    연동하기
                  </button>
                )}
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="상품명으로 검색"
                  value={coupangSearchQuery}
                  onChange={(e) => setCoupangSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { isCoupangConnected ? handleCoupangSearch() : setShowCoupangModal(true); } }}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#C41E1E]"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {coupangSearchQuery && (
                    <button
                      onClick={() => setCoupangSearchQuery("")}
                      className="cursor-pointer p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => { isCoupangConnected ? handleCoupangSearch() : setShowCoupangModal(true); }}
                    className="cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]"
                  >
                    검색
                  </button>
                </div>
              </div>
            </div>

            {/* ── 연동 완료 + 검색 전: 안내 ── */}
            {isCoupangConnected && !coupangHasSearched && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="mb-1 text-base font-semibold text-gray-900">연동 완료!</h4>
                <p className="text-sm text-gray-500">
                  상품명을 검색하면 쿠팡 상품이 표시됩니다
                </p>
              </div>
            )}

            {/* ── 미연동 상태: 안내 ── */}
            {!isCoupangConnected && !coupangHasSearched && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h4 className="mb-1 text-base font-semibold text-gray-900">쿠팡 파트너스 연동을 해주세요</h4>
                <p className="mb-5 text-sm text-gray-500">
                  파트너스를 연동하면<br />쿠팡 상품을 검색하고 쇼핑몰에 추가할 수 있어요
                </p>
                <button
                  onClick={() => setShowCoupangModal(true)}
                  className="cursor-pointer rounded-lg bg-[#C41E1E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                >
                  연동하기
                </button>
              </div>
            )}

            {/* ── 검색 결과 ── */}
            {isCoupangConnected && coupangHasSearched && (
              <div>
                {/* 정렬 + 결과 수 */}
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    상품 추천 <span className="text-gray-400">· {coupangResults.length}개</span>
                  </h4>
                  <div className="flex gap-1.5">
                    {([
                      { key: "rank" as const, label: "판매 랭킹" },
                      { key: "price_low" as const, label: "낮은가격" },
                      { key: "price_high" as const, label: "높은가격" },
                      { key: "review" as const, label: "리뷰많은순" },
                    ]).map((sort) => (
                      <button
                        key={sort.key}
                        onClick={() => setCoupangSortBy(sort.key)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
                          coupangSortBy === sort.key
                            ? "bg-[#111111] text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 랭킹 기준 안내 */}
                <p className="mb-4 text-xs text-gray-400">랭킹 기준: 판매량 + 리뷰 수 + 평점 종합</p>

                {/* 상품 그리드 */}
                <div className="grid grid-cols-4 gap-4">
                  {sortedCoupangResults.map((product) => {
                    const isAdded = coupangAdded.some((p) => p.id === product.id);
                    return (
                      <div
                        key={product.id}
                        className={`overflow-hidden rounded-xl border transition-colors ${isAdded ? "border-[#C41E1E]" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        {/* 이미지 */}
                        <div className="relative aspect-square bg-gray-100">
                          <div className="flex h-full items-center justify-center text-gray-300">
                            {IMAGE_PLACEHOLDER}
                          </div>
                          <span className="absolute left-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-md bg-[#111111] px-1.5 text-xs font-bold text-white">
                            {product.rank}
                          </span>
                          {isAdded && (
                            <span className="absolute right-2 top-2 rounded bg-[#C41E1E] px-2 py-0.5 text-xs font-medium text-white">
                              추가됨
                            </span>
                          )}
                        </div>
                        {/* 정보 */}
                        <div className="p-3">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">
                            {product.name}
                          </p>
                          <p className="mt-1.5 text-base font-bold text-[#C41E1E]">
                            {formatPrice(product.price)}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="text-yellow-500">★</span> {product.rating}
                            <span className="mx-0.5">·</span>
                            리뷰 {product.reviewCount.toLocaleString()}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400">
                            수수료 {product.commission}% · 예상 {formatPrice(Math.round(product.price * product.commission / 100))}
                          </p>
                          <button
                            onClick={() => !isAdded && handleCoupangGenerateLink(product)}
                            disabled={isAdded}
                            className={`mt-3 w-full cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                              isAdded
                                ? "bg-gray-100 text-gray-400 cursor-default"
                                : "bg-[#C41E1E] text-white hover:bg-[#A01818]"
                            }`}
                          >
                            {isAdded ? "✓ 추가됨" : "링크 생성"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 추가된 상품 목록 ── */}
            {coupangAdded.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-gray-700">
                  내 쇼핑몰에 추가된 쿠팡 상품 <span className="text-[#C41E1E]">{coupangAdded.length}</span>
                </h4>
                <div className="space-y-2">
                  {coupangAdded.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
                        {IMAGE_PLACEHOLDER_XS}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatPrice(item.price)} · 수수료 {item.commission}%
                        </p>
                      </div>
                      <span className="shrink-0 truncate max-w-[180px] rounded bg-gray-50 px-2 py-1 text-xs text-gray-400">
                        {item.affiliateLink}
                      </span>
                      <button
                        onClick={() => setCoupangAdded((prev) => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 cursor-pointer text-gray-400 hover:text-red-500"
                      >
                        {DELETE_ICON}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━ 네이버·기타 ━━━ */}
        {activeTab === "naver" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-gray-500">
              네이버 스마트스토어, 자사몰 등 외부 링크를 추가할 수 있어요.
              <br />
              URL을 붙여넣으면 상품 정보를 자동으로 가져옵니다.
            </p>

            {/* URL 입력 */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="상품 URL을 입력하세요"
                  value={naverUrl}
                  onChange={(e) => setNaverUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
                <button
                  onClick={handleNaverFetch}
                  className="cursor-pointer whitespace-nowrap rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                >
                  상품 가져오기
                </button>
              </div>

              {/* 미리보기 */}
              {naverPreview && (
                <div className="mt-4 flex items-center gap-4 rounded-lg border border-gray-200 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                    {IMAGE_PLACEHOLDER_SM}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{naverPreview.name}</p>
                    <p className="mt-1 text-base font-bold text-[#C41E1E]">
                      {formatPrice(naverPreview.price)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">외부 링크 연결</p>
                  </div>
                  <button
                    onClick={handleNaverAdd}
                    className="shrink-0 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
                  >
                    내 쇼핑몰에 추가
                  </button>
                </div>
              )}
            </div>

            {/* 추가된 상품 목록 */}
            {naverAdded.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">추가된 상품</h4>
                {naverAdded.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
                      {IMAGE_PLACEHOLDER_XS}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatPrice(item.price)} · 외부 링크
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setNaverAdded((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="cursor-pointer text-gray-400 hover:text-red-500"
                    >
                      {DELETE_ICON}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ━━━ 상품 조르기 ━━━ */}
        {activeTab === "request" && (
          <div className="space-y-6">
            {/* 안내 박스 */}
            <div className="rounded-lg border-l-[3px] border-l-[#C41E1E] bg-red-50 p-4">
              <p className="text-sm leading-relaxed text-gray-700">
                원하는 상품이 없나요? 튜핑에 소싱을 요청해보세요.
                <br />
                검토 후 공구상품으로 등록되면 알림을 드릴게요.
              </p>
            </div>

            {/* 입력 폼 */}
            <div className="space-y-4 rounded-xl border border-gray-200 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  상품명 <span className="text-[#C41E1E]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="요청할 상품명을 입력하세요"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  상품 링크 <span className="text-[#C41E1E]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="상품 URL을 입력하세요"
                  value={requestLink}
                  onChange={(e) => setRequestLink(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  간단한 설명 <span className="text-gray-400">(선택)</span>
                </label>
                <textarea
                  placeholder="요청 사유나 참고사항을 입력하세요"
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleRequestSubmit}
                  className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                >
                  튜핑에 요청 보내기
                </button>
              </div>
            </div>

            {/* 요청 내역 */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">요청 내역</h4>
              <div className="space-y-2">
                {REQUEST_HISTORY.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(req.status)}`}
                      >
                        {req.status}
                      </span>
                      <span className="text-sm text-gray-900">{req.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{req.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
