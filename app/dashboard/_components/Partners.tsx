"use client";

import { useState, useEffect } from "react";

// ─── 타입 ───
type Tab = "search" | "deeplink" | "manage";

interface CoupangProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryName: string;
  rank: number;
  isRocket: boolean;
}

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function getCoupangKeys() {
  if (typeof window === "undefined") return { access: "", secret: "" };
  return {
    access: localStorage.getItem("coupang_access_key") || "",
    secret: localStorage.getItem("coupang_secret_key") || "",
  };
}

// ─── 메인 컴포넌트 ───
export default function Partners() {
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const keys = getCoupangKeys();
    setIsConnected(!!keys.access && !!keys.secret);
    setAccessKey(keys.access);
    setSecretKey(keys.secret);
  }, []);

  const handleConnect = () => {
    if (!accessKey.trim() || !secretKey.trim()) return;
    localStorage.setItem("coupang_access_key", accessKey);
    localStorage.setItem("coupang_secret_key", secretKey);
    setIsConnected(true);
    setShowConnectModal(false);
    setToastMessage("쿠팡 파트너스 연동이 완료되었습니다!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleDisconnect = () => {
    localStorage.removeItem("coupang_access_key");
    localStorage.removeItem("coupang_secret_key");
    setIsConnected(false);
    setAccessKey("");
    setSecretKey("");
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "search", label: "상품 찾기" },
    { key: "deeplink", label: "상품 링크 만들기" },
    { key: "manage", label: "연동 관리" },
  ];

  return (
    <div className="p-6">
      {/* 토스트 */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* 연동 모달 */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button onClick={() => setShowConnectModal(false)} className="float-right cursor-pointer text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">쿠팡 파트너스 연동을 진행합니다</h3>
            <p className="mb-4 text-sm text-gray-500">서비스 이용을 위해 아래 정보를 입력한 후<br />연동하기 버튼을 눌러주세요</p>
            <div className="mb-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <ul className="space-y-1">
                <li>본 연동은 쿠팡 파트너스 계정이 있어야 가능해요</li>
                <li>내 Access Key와 Secret Key는 <span className="font-medium">쿠팡 파트너스 &gt; 추가 기능 &gt; 파트너스 API</span> 메뉴에서 확인해 주세요</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Access Key <span className="text-[#C41E1E]">*</span></label>
                <input
                  type="text"
                  placeholder="Access Key를 입력해 주세요"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Secret Key <span className="text-[#C41E1E]">*</span></label>
                <input
                  type="password"
                  placeholder="Secret Key를 입력해 주세요"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={!accessKey.trim() || !secretKey.trim()}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-50"
            >
              연동하기
            </button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900">파트너스</h2>
        {isConnected && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연동됨</span>
        )}
      </div>

      {/* 탭 */}
      <div className="mb-5 flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[#C41E1E] text-[#C41E1E]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "search" && <SearchTab isConnected={isConnected} onConnect={() => setShowConnectModal(true)} />}
      {activeTab === "deeplink" && <DeeplinkTab isConnected={isConnected} onConnect={() => setShowConnectModal(true)} />}
      {activeTab === "manage" && <ManageTab isConnected={isConnected} onConnect={() => setShowConnectModal(true)} onDisconnect={handleDisconnect} />}
    </div>
  );
}

// ─── 상품 찾기 탭 ───
function SearchTab({ isConnected, onConnect }: { isConnected: boolean; onConnect: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<CoupangProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const CATEGORIES = ["전체", "식품", "로켓프레시", "생활용품", "주방용품", "가구/홈인테리어", "가전디지털", "뷰티", "패션의류", "패션잡화"];

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    setHasSearched(true);
    const keys = getCoupangKeys();
    const headers: Record<string, string> = {};
    if (keys.access && keys.secret) {
      headers["x-coupang-access-key"] = keys.access;
      headers["x-coupang-secret-key"] = keys.secret;
    }
    try {
      const res = await fetch(`/api/coupang/search?keyword=${encodeURIComponent(keyword)}&limit=20`, { headers });
      const data = await res.json();
      setProducts(data.data?.productData || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = (product: CoupangProduct) => {
    if (!isConnected) {
      onConnect();
      return;
    }
    // 연동된 경우 — 이미 productUrl에 어필리에이트 링크가 포함됨
    navigator.clipboard.writeText(product.productUrl);
    setToastMessage(`링크가 복사되었습니다!`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const filteredProducts = selectedCategory && selectedCategory !== "전체"
    ? products.filter((p) => p.categoryName === selectedCategory)
    : products;

  return (
    <div>
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* 검색 */}
      <div className="mb-5">
        <h3 className="mb-3 text-base font-semibold text-gray-900">상품 검색</h3>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="쿠팡 상품명으로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-20 text-sm outline-none focus:border-[#C41E1E]"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]"
          >
            검색
          </button>
        </div>
      </div>

      {/* 미검색 안내 */}
      {!hasSearched && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h4 className="mb-1 text-base font-semibold text-gray-900">상품을 검색해보세요</h4>
          <p className="text-sm text-gray-500">쿠팡 상품을 검색하고 파트너스 링크를 생성할 수 있어요</p>
          {!isConnected && (
            <p className="mt-3 text-xs text-gray-400">파트너스 연동 후 어필리에이트 링크 생성이 가능합니다</p>
          )}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
        </div>
      )}

      {/* 검색 결과 */}
      {!loading && hasSearched && products.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">상품 추천</h3>
          </div>

          {/* 카테고리 필터 */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === "전체" ? null : cat)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  (selectedCategory === null && cat === "전체") || selectedCategory === cat
                    ? "bg-[#111111] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 상품 그리드 */}
          <div className="grid grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.productId} className="overflow-hidden rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-100">
                  {product.productImage ? (
                    <img src={product.productImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#C41E1E] px-1.5 text-xs font-bold text-white">
                    {product.rank}
                  </span>
                  {product.isRocket && (
                    <span className="absolute right-2 top-2 rounded bg-[#111111] px-1.5 py-0.5 text-[10px] font-medium text-white">로켓</span>
                  )}
                  <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="absolute right-2 bottom-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-white">
                    상품 정보
                  </a>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">
                    {product.productName}
                  </p>
                  <p className="mt-1.5 text-base font-bold text-[#C41E1E]">{formatPrice(product.productPrice)}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{product.categoryName}</p>
                  <button
                    onClick={() => handleGenerateLink(product)}
                    className="mt-3 w-full cursor-pointer rounded-lg bg-[#C41E1E] py-2 text-sm font-medium text-white hover:bg-[#A01818]"
                  >
                    {isConnected ? "링크 생성" : "연동 후 링크 생성"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 빈 결과 */}
      {!loading && hasSearched && products.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-gray-500">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}

// ─── 상품 링크 만들기 탭 ───
function DeeplinkTab({ isConnected, onConnect }: { isConnected: boolean; onConnect: () => void }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    if (!isConnected) { onConnect(); return; }

    setLoading(true);
    setResult("");
    const keys = getCoupangKeys();
    try {
      const res = await fetch("/api/coupang/deeplink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coupang-access-key": keys.access,
          "x-coupang-secret-key": keys.secret,
        },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = await res.json();
      const link = data.data?.[0]?.shortenUrl || data.data?.landingUrl || "";
      setResult(link);
    } catch {
      setResult("");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h3 className="mb-2 text-base font-semibold text-gray-900">상품 링크 만들기</h3>
      <p className="mb-4 text-sm text-gray-500">
        쿠팡에서 상품 페이지의 URL을 복사해<br />쉽게 파트너스 링크로 만들 수 있어요
      </p>

      <div className="rounded-xl border border-gray-200 p-5">
        <input
          type="text"
          placeholder="쿠팡 상품 주소(URL)를 붙여 넣어주세요"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#C41E1E]"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !url.trim()}
          className="mt-3 w-full cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-50"
        >
          {loading ? "생성 중..." : "링크 생성"}
        </button>

        {result && (
          <div className="mt-4 rounded-lg bg-green-50 p-4">
            <p className="mb-2 text-xs font-medium text-green-700">파트너스 링크가 생성되었습니다!</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={result}
                readOnly
                className="flex-1 rounded border border-green-200 bg-white px-3 py-2 text-xs text-gray-700"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-xs font-medium text-white hover:bg-[#A01818]"
              >
                {copied ? "복사됨!" : "복사"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 연동 관리 탭 ───
function ManageTab({ isConnected, onConnect, onDisconnect }: { isConnected: boolean; onConnect: () => void; onDisconnect: () => void }) {
  const naverId = typeof window !== "undefined" ? localStorage.getItem("naver_partner_id") || "" : "";

  return (
    <div className="space-y-4">
      {/* 쿠팡 */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e44232]/10">
              <span className="text-lg font-bold text-[#e44232]">C</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">쿠팡 파트너스</p>
              <p className="text-xs text-gray-500">상품 검색 + 어필리에이트 링크 자동 생성</p>
            </div>
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연결됨</span>
              <button onClick={onDisconnect} className="cursor-pointer text-xs text-gray-400 hover:text-red-500">해제</button>
            </div>
          ) : (
            <button onClick={onConnect} className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]">
              연동하기
            </button>
          )}
        </div>
      </div>

      {/* 네이버 */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#03C75A]/10">
              <span className="text-lg font-bold text-[#03C75A]">N</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">네이버 파트너스</p>
              <p className="text-xs text-gray-500">네이버 상품 링크에 추적 코드 자동 추가</p>
            </div>
          </div>
          {naverId ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연결됨</span>
          ) : (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">미연결</span>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">설정 → 어필리에이트 연동에서 네이버 파트너스 ID를 입력하세요</p>
      </div>

      {/* 인스타그램 (준비 중) */}
      <div className="rounded-xl border border-gray-200 p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]/10">
              <span className="text-lg font-bold text-[#E4405F]">IG</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Instagram</p>
              <p className="text-xs text-gray-500">프로필 연동 + DM 자동화</p>
            </div>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">준비 중</span>
        </div>
      </div>
    </div>
  );
}
