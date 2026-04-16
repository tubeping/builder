"use client";

import { useState, useEffect, useCallback } from "react";

// ─── 타입 ───
type SourceType = "tubeping_campaign" | "coupang" | "naver" | "own" | "other";
type FilterKey = "all" | SourceType;

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
  // 표시용 (DB 또는 source_meta에서 추출)
  name: string;
  category: string;
  price: number;
  image: string | null;
  revenue: number;
}

// ─── 더미 데이터 (DB 미연결 시 폴백) ───
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

// ─── 새 PICK 추가 모달 ───
interface AddPickModalProps {
  onClose: () => void;
  onAdd: (pick: Partial<PickItem>) => void;
}

function AddPickModal({ onClose, onAdd }: AddPickModalProps) {
  const [tab, setTab] = useState<SourceType>("coupang");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [comment, setComment] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(false);

  const TABS: { key: SourceType; label: string; icon: string }[] = [
    { key: "coupang", label: "쿠팡파트너스", icon: "🟠" },
    { key: "naver", label: "네이버", icon: "🟢" },
    { key: "own", label: "직접 상품", icon: "📦" },
    { key: "other", label: "기타 제휴", icon: "🔗" },
  ];

  const resetForm = () => {
    setUrl(""); setName(""); setPrice(""); setCategory("");
    setImage(""); setComment(""); setAffiliateCode("");
    setParsed(false);
  };

  const handleTabChange = (t: SourceType) => {
    setTab(t);
    resetForm();
  };

  // 쿠팡 URL 붙여넣기 → 자동 파싱 시뮬레이션
  const handleUrlPaste = async () => {
    if (!url.trim()) return;
    setLoading(true);
    // URL에서 상품 정보 추출 시뮬레이션 (실제로는 API 호출)
    await new Promise((r) => setTimeout(r, 800));

    if (tab === "coupang" && url.includes("coupang.com")) {
      setName("쿠팡 상품 (URL에서 자동 추출)");
      setPrice("0");
      setCategory("자동 분류");
      setParsed(true);
    } else if (tab === "naver" && (url.includes("smartstore") || url.includes("naver"))) {
      setName("네이버 상품 (URL에서 자동 추출)");
      setPrice("0");
      setCategory("자동 분류");
      setParsed(true);
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      source_type: tab,
      name: name.trim(),
      price: parseInt(price) || 0,
      category: category.trim() || "미분류",
      image: image.trim() || null,
      external_url: url.trim() || null,
      affiliate_code: affiliateCode.trim() || null,
      curation_comment: comment.trim(),
      source_meta: tab === "coupang" ? { commission_rate: 3 }
        : tab === "naver" ? {}
        : tab === "own" ? { custom_price: parseInt(price) || 0 }
        : {},
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">새 PICK 추가</h3>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 소스 탭 */}
        <div className="flex border-b px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-[#C41E1E] text-[#C41E1E]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <div className="space-y-4 px-6 py-5">
          {/* 쿠팡 / 네이버: URL 입력 → 자동 파싱 */}
          {(tab === "coupang" || tab === "naver") && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {tab === "coupang" ? "쿠팡" : "네이버"} 상품 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={tab === "coupang" ? "https://www.coupang.com/vp/products/..." : "https://smartstore.naver.com/..."}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
                  />
                  <button
                    onClick={handleUrlPaste}
                    disabled={loading || !url.trim()}
                    className="cursor-pointer whitespace-nowrap rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-default"
                  >
                    {loading ? "분석 중..." : "URL 분석"}
                  </button>
                </div>
                {parsed && (
                  <p className="mt-1 text-xs text-green-600">상품 정보를 자동으로 가져왔습니다. 수정 가능합니다.</p>
                )}
              </div>

              {tab === "coupang" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">제휴 코드 (선택)</label>
                  <input
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value)}
                    placeholder="쿠팡 파트너스 코드"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
                  />
                </div>
              )}
            </>
          )}

          {/* 공통 필드 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">상품명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="상품명을 입력하세요"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">가격</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">카테고리</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="건강식품, 생활 등"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
          </div>

          {/* 직접 상품 / 기타: 구매 링크 */}
          {(tab === "own" || tab === "other") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">구매 링크</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">이미지 URL (선택)</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">큐레이션 코멘트</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="이 상품을 추천하는 이유를 적어주세요"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]"
            />
          </div>
        </div>

        {/* 하단 */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-40 disabled:cursor-default"
          >
            PICK 추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───
export default function MyPicks() {
  const [picks, setPicks] = useState<PickItem[]>(FALLBACK_PICKS);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // DB에서 PICK 로드 시도
  const loadPicks = useCallback(async () => {
    try {
      const res = await fetch("/api/picks");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length >= 0) {
          setIsDbConnected(true);
          if (data.length > 0) {
            const mapped: PickItem[] = data.map((d: Record<string, unknown>) => ({
              id: d.id as string,
              source_type: (d.source_type as SourceType) || "tubeping_campaign",
              product_id: d.product_id as string | null,
              external_url: d.external_url as string | null,
              affiliate_code: d.affiliate_code as string | null,
              source_meta: (d.source_meta as Record<string, unknown>) || {},
              display_order: (d.display_order as number) || 0,
              visible: d.visible !== false,
              curation_comment: (d.curation_comment as string) || "",
              clicks: (d.clicks as number) || 0,
              conversions: (d.conversions as number) || 0,
              name: ((d.source_meta as Record<string, unknown>)?.name as string) || ((d as Record<string, unknown> & { products?: { product_name?: string } }).products?.product_name) || "상품명 없음",
              category: (d.source_meta as Record<string, unknown>)?.category as string || "",
              price: (d.source_meta as Record<string, unknown>)?.price as number || 0,
              image: (d.source_meta as Record<string, unknown>)?.image as string | null || null,
              revenue: 0,
            }));
            setPicks(mapped);
          }
        }
      }
    } catch {
      // DB 미연결 → 폴백 데이터 유지
    }
  }, []);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const filtered = picks.filter((p) => filter === "all" ? true : p.source_type === filter);

  // ─── CRUD ───
  const apiPatch = async (id: string, updates: Record<string, unknown>) => {
    if (!isDbConnected) return;
    await fetch("/api/picks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
  };

  const toggleVisible = (id: string) => {
    setPicks((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, visible: !p.visible };
      apiPatch(id, { visible: next.visible });
      return next;
    }));
  };

  const moveUp = (id: string) => {
    setPicks((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      // DB 순서 업데이트
      apiPatch(next[idx - 1].id, { display_order: idx - 1 });
      apiPatch(next[idx].id, { display_order: idx });
      return next;
    });
  };

  const moveDown = (id: string) => {
    setPicks((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      apiPatch(next[idx].id, { display_order: idx });
      apiPatch(next[idx + 1].id, { display_order: idx + 1 });
      return next;
    });
  };

  const saveComment = (id: string) => {
    setPicks((prev) => prev.map((p) => (p.id === id ? { ...p, curation_comment: commentDraft } : p)));
    apiPatch(id, { curation_comment: commentDraft });
    setEditingId(null);
  };

  const startEdit = (p: PickItem) => {
    setEditingId(p.id);
    setCommentDraft(p.curation_comment);
  };

  const removePick = async (id: string) => {
    setPicks((prev) => prev.filter((p) => p.id !== id));
    if (isDbConnected) {
      await fetch(`/api/picks?id=${id}`, { method: "DELETE" });
    }
  };

  const addPick = async (partial: Partial<PickItem>) => {
    const newPick: PickItem = {
      id: "temp-" + Date.now(),
      source_type: partial.source_type || "own",
      product_id: null,
      external_url: partial.external_url || null,
      affiliate_code: partial.affiliate_code || null,
      source_meta: {
        ...(partial.source_meta || {}),
        name: partial.name,
        category: partial.category,
        price: partial.price,
        image: partial.image,
      },
      display_order: picks.length,
      visible: true,
      curation_comment: partial.curation_comment || "",
      clicks: 0,
      conversions: 0,
      name: partial.name || "",
      category: partial.category || "",
      price: partial.price || 0,
      image: partial.image || null,
      revenue: 0,
    };

    setPicks((prev) => [...prev, newPick]);
    setShowAddModal(false);

    if (isDbConnected) {
      try {
        const res = await fetch("/api/picks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_type: newPick.source_type,
            external_url: newPick.external_url,
            affiliate_code: newPick.affiliate_code,
            curation_comment: newPick.curation_comment,
            source_meta: newPick.source_meta,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          setPicks((prev) => prev.map((p) => (p.id === newPick.id ? { ...newPick, id: saved.id } : p)));
        }
      } catch { /* 실패 시 로컬 상태 유지 */ }
    }
  };

  // ─── 필터 ───
  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "전체", count: picks.length },
    { key: "tubeping_campaign", label: "공구", count: picks.filter((p) => p.source_type === "tubeping_campaign").length },
    { key: "coupang", label: "쿠팡", count: picks.filter((p) => p.source_type === "coupang").length },
    { key: "naver", label: "네이버", count: picks.filter((p) => p.source_type === "naver").length },
    { key: "own", label: "직접", count: picks.filter((p) => p.source_type === "own").length },
    { key: "other", label: "기타", count: picks.filter((p) => p.source_type === "other").length },
  ];

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">내 PICK</h2>
          <p className="mt-1 text-sm text-gray-500">
            여러 소스에서 모은 추천 상품의 큐레이션 아카이브
            {!isDbConnected && (
              <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                더미 데이터
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
        >
          + 새 PICK 추가
        </button>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {FILTERS.filter((f) => f.key === "all" || f.count > 0).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-[#111111] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* PICK 리스트 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm font-medium text-gray-900">아직 PICK이 없습니다</p>
          <p className="mt-1 text-xs text-gray-500">상단 &ldquo;+ 새 PICK 추가&rdquo; 버튼으로 시작하세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pick, idx) => (
            <div
              key={pick.id}
              className={`rounded-xl border p-4 transition-colors ${
                pick.visible ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex gap-4">
                {/* 이미지 */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {pick.image ? (
                    <img src={pick.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* 본문 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceBadgeStyle(pick.source_type)}`}>
                      {sourceLabel(pick.source_type)}
                    </span>
                    {pick.category && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {pick.category}
                      </span>
                    )}
                    {pick.external_url && (
                      <a
                        href={pick.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gray-400 hover:text-[#C41E1E]"
                      >
                        링크 →
                      </a>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{pick.name}</h3>
                  {pick.price > 0 && (
                    <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>
                  )}

                  {/* 통계 */}
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>클릭 <span className="font-medium text-gray-900">{pick.clicks}</span></span>
                    <span>전환 <span className="font-medium text-gray-900">{pick.conversions}</span></span>
                    {pick.revenue > 0 && (
                      <span>수익 <span className="font-medium text-[#C41E1E]">{formatPrice(pick.revenue)}</span></span>
                    )}
                  </div>

                  {/* 큐레이션 코멘트 */}
                  {editingId === pick.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="큐레이션 코멘트 입력"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#C41E1E]"
                        onKeyDown={(e) => e.key === "Enter" && saveComment(pick.id)}
                      />
                      <button
                        onClick={() => saveComment(pick.id)}
                        className="cursor-pointer rounded bg-[#C41E1E] px-3 py-1 text-xs font-medium text-white hover:bg-[#A01818]"
                      >
                        저장
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(pick)}
                      className="mt-2 block text-left text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {pick.curation_comment ? (
                        <span className="italic">&ldquo;{pick.curation_comment}&rdquo;</span>
                      ) : (
                        <span className="text-gray-400">+ 큐레이션 코멘트 추가</span>
                      )}
                    </button>
                  )}
                </div>

                {/* 액션 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveUp(pick.id)}
                      disabled={idx === 0}
                      className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(pick.id)}
                      disabled={idx === filtered.length - 1}
                      className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => toggleVisible(pick.id)}
                    className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium ${
                      pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {pick.visible ? "노출" : "숨김"}
                  </button>
                  <button
                    onClick={() => removePick(pick.id)}
                    className="cursor-pointer rounded px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 추가 모달 */}
      {showAddModal && <AddPickModal onClose={() => setShowAddModal(false)} onAdd={addPick} />}
    </div>
  );
}
