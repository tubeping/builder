"use client";

import { useState, useEffect, useCallback } from "react";
import { generateScriptLocal } from "@/lib/scriptTemplates";

// ─── 타입 ───
type ScriptStatus = "draft" | "ready" | "published";
type Platform = "youtube" | "instagram" | "tiktok";
type ScriptFormat = "longform" | "shorts" | "post";

interface Cafe24Product {
  product_no: number;
  product_name: string;
  price: string;
  retail_price: string;
  supply_price: string;
  detail_image: string;
  list_image: string;
  small_image: string;
  selling: string;
  product_code: string;
  created_date: string;
  updated_date: string;
}

interface ScriptSection {
  key: string;
  label: string;
  placeholder: string;
}

interface GongguScript {
  id: string;
  productNo: number;
  productName: string;
  productImage: string;
  status: ScriptStatus;
  platforms: Platform[];
  format: ScriptFormat;
  createdAt: string;
  updatedAt: string;

  // 롱폼 섹션
  hook: string;
  intro: string;
  benefits: string;
  dealInfo: string;
  cta: string;
  memo: string;

  // 숏폼 전용
  core: string;

  // 게시글 전용
  opening: string;
  body: string;
  hashtags: string;

  // 공구 조건
  originalPrice: number;
  gongguPrice: number;
  gongguStart: string;
  gongguEnd: string;

  // AI 생성 컨텍스트
  experience: string;
  target: string;
  tone: string;
}

const FORMAT_META: Record<ScriptFormat, { label: string; desc: string; icon: string }> = {
  longform: { label: "롱폼 리뷰", desc: "유튜브 3~8분 상품 리뷰", icon: "🎬" },
  shorts: { label: "숏폼", desc: "쇼츠/릴스 15~60초", icon: "⚡" },
  post: { label: "게시글", desc: "인스타 피드·블로그용", icon: "📝" },
};

const SECTIONS_BY_FORMAT: Record<ScriptFormat, ScriptSection[]> = {
  longform: [
    { key: "hook", label: "훅 (첫 20초)", placeholder: "시청자를 붙잡는 첫 구간" },
    { key: "intro", label: "인트로 (공감·배경)", placeholder: "왜 이 제품을 리뷰하게 됐는지" },
    { key: "benefits", label: "장점 / 사용 후기", placeholder: "실사용 경험 + Before/After" },
    { key: "dealInfo", label: "공구 조건", placeholder: "가격·할인율·기간·수량·증정" },
    { key: "cta", label: "CTA (구매 유도)", placeholder: "링크 안내 + 마감 강조" },
    { key: "memo", label: "메모", placeholder: "촬영 시 참고 (공개 안 됨)" },
  ],
  shorts: [
    { key: "hook", label: "훅 (1~3초, 7단어 이하)", placeholder: "임팩트 강한 첫 문구" },
    { key: "core", label: "코어 (10~30초)", placeholder: "장점 1~2개 + 공구 조건 핵심" },
    { key: "cta", label: "CTA (2~5초, 시한성)", placeholder: "프로필 링크 + 마감 강조" },
    { key: "memo", label: "메모", placeholder: "촬영 시 참고 (공개 안 됨)" },
  ],
  post: [
    { key: "opening", label: "오프닝 (1~2줄)", placeholder: "시선 잡는 첫 문구" },
    { key: "body", label: "본문", placeholder: "제품 소개 + 후기 + 공구 조건" },
    { key: "hashtags", label: "해시태그", placeholder: "#브랜드 #카테고리 #공구 ..." },
    { key: "cta", label: "CTA (구매 유도)", placeholder: "링크 안내" },
    { key: "memo", label: "메모", placeholder: "(공개 안 됨)" },
  ],
};

const STORAGE_KEY = "tubeping_gonggu_scripts";

// ─── localStorage 헬퍼 ───
const MIGRATION_DEFAULTS = {
  format: "longform" as ScriptFormat,
  core: "",
  opening: "",
  body: "",
  hashtags: "",
  experience: "",
  target: "",
  tone: "",
};

function loadScripts(): GongguScript[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<Partial<GongguScript>>;
    // 기존 데이터 호환 (format 없던 시절)
    return arr.map((s) => Object.assign({ ...MIGRATION_DEFAULTS }, s) as GongguScript);
  } catch {
    return [];
  }
}

function saveScripts(scripts: GongguScript[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

function statusBadge(s: ScriptStatus) {
  switch (s) {
    case "draft": return { label: "작성중", style: "bg-gray-100 text-gray-500" };
    case "ready": return { label: "준비완료", style: "bg-green-50 text-green-600" };
    case "published": return { label: "공구중", style: "bg-red-50 text-[#C41E1E]" };
  }
}

function platformIcon(p: Platform) {
  switch (p) {
    case "youtube": return "▶";
    case "instagram": return "◎";
    case "tiktok": return "♪";
  }
}

function platformLabel(p: Platform) {
  switch (p) {
    case "youtube": return "YouTube";
    case "instagram": return "Instagram";
    case "tiktok": return "TikTok";
  }
}

function platformColor(p: Platform) {
  switch (p) {
    case "youtube": return "bg-red-100 text-red-600";
    case "instagram": return "bg-purple-100 text-purple-600";
    case "tiktok": return "bg-gray-900 text-white";
  }
}

function discountRate(original: number, gonggu: number) {
  if (original <= 0) return 0;
  return Math.round((1 - gonggu / original) * 100);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── 메인 컴포넌트 ───
export default function ContentAnalytics() {
  const [scripts, setScripts] = useState<GongguScript[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | ScriptStatus>("all");
  const [filterFormat, setFilterFormat] = useState<"all" | ScriptFormat>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Cafe24Product | null>(null);
  const [pendingFormat, setPendingFormat] = useState<ScriptFormat>("longform");
  const [copied, setCopied] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // 카페24 상품 로딩 상태
  const [cafe24Products, setCafe24Products] = useState<Cafe24Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 초기 로드
  useEffect(() => {
    setScripts(loadScripts());
  }, []);

  // scripts 변경 시 저장
  useEffect(() => {
    if (scripts.length > 0) saveScripts(scripts);
  }, [scripts]);

  // 카페24 상품 불러오기
  const fetchProducts = useCallback(async (keyword?: string) => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/cafe24/products?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setCafe24Products(data.products || []);
    } catch (err) {
      setProductsError("상품을 불러올 수 없습니다. 카페24 연동을 확인해주세요.");
      console.error("Cafe24 fetch error:", err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // 상품 선택 팝업 열 때 로드
  useEffect(() => {
    if (showProductPicker) fetchProducts();
  }, [showProductPicker, fetchProducts]);

  const filtered = scripts
    .filter(s => filterStatus === "all" || s.status === filterStatus)
    .filter(s => filterFormat === "all" || s.format === filterFormat)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const counts = {
    all: scripts.length,
    draft: scripts.filter(s => s.status === "draft").length,
    ready: scripts.filter(s => s.status === "ready").length,
    published: scripts.filter(s => s.status === "published").length,
  };

  function handlePickProduct(product: Cafe24Product) {
    setPendingProduct(product);
    setPendingFormat("longform");
  }

  function handleConfirmPendingProduct() {
    if (!pendingProduct) return;

    const existing = scripts.find(
      s => s.productNo === pendingProduct.product_no && s.format === pendingFormat
    );
    if (existing) {
      setExpandedId(existing.id);
      setEditingId(existing.id);
      setShowProductPicker(false);
      setPendingProduct(null);
      return;
    }

    const price = parseFloat(pendingProduct.price) || 0;
    const retailPrice = parseFloat(pendingProduct.retail_price) || 0;

    const newScript: GongguScript = {
      id: `s_${pendingProduct.product_no}_${pendingFormat}_${Date.now()}`,
      productNo: pendingProduct.product_no,
      productName: pendingProduct.product_name.replace(/<[^>]*>/g, "").trim(),
      productImage: pendingProduct.detail_image || pendingProduct.list_image || pendingProduct.small_image || "",
      status: "draft",
      platforms: pendingFormat === "post" ? ["instagram"] : ["youtube"],
      format: pendingFormat,
      createdAt: today(),
      updatedAt: today(),
      hook: "", intro: "", benefits: "", dealInfo: "", cta: "", memo: "",
      core: "",
      opening: "", body: "", hashtags: "",
      originalPrice: retailPrice > 0 ? retailPrice : price,
      gongguPrice: price,
      gongguStart: "",
      gongguEnd: "",
      experience: "",
      target: "",
      tone: "친근",
    };

    setScripts(prev => {
      const next = [newScript, ...prev];
      saveScripts(next);
      return next;
    });
    setShowProductPicker(false);
    setPendingProduct(null);
    setExpandedId(newScript.id);
    setEditingId(newScript.id);
  }

  function handleSectionEdit(scriptId: string, sectionKey: string, value: string) {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId ? { ...s, [sectionKey]: value, updatedAt: today() } : s
      );
      saveScripts(next);
      return next;
    });
  }

  function handleFieldEdit(scriptId: string, field: string, value: string | number | Platform[]) {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId ? { ...s, [field]: value, updatedAt: today() } : s
      );
      saveScripts(next);
      return next;
    });
  }

  function handleStatusChange(scriptId: string, newStatus: ScriptStatus) {
    handleFieldEdit(scriptId, "status", newStatus);
  }

  function handleDelete(scriptId: string) {
    setScripts(prev => {
      const next = prev.filter(s => s.id !== scriptId);
      saveScripts(next);
      return next;
    });
    if (editingId === scriptId) setEditingId(null);
    if (expandedId === scriptId) setExpandedId(null);
  }

  function handleCopyScript(script: GongguScript) {
    let fullScript = "";
    if (script.format === "longform") {
      fullScript = [
        script.hook && `${script.hook}\n`,
        script.intro && `${script.intro}\n`,
        script.benefits && `✅ 장점\n${script.benefits}\n`,
        script.dealInfo && `💰 공구 조건\n${script.dealInfo}\n`,
        script.cta && `👉 ${script.cta}`,
      ].filter(Boolean).join("\n");
    } else if (script.format === "shorts") {
      fullScript = [script.hook, script.core, script.cta].filter(Boolean).join("\n\n");
    } else if (script.format === "post") {
      fullScript = [
        script.opening,
        script.body,
        script.cta,
        script.hashtags,
      ].filter(Boolean).join("\n\n");
    }
    navigator.clipboard.writeText(fullScript);
    setCopied(script.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function togglePlatform(scriptId: string, p: Platform) {
    setScripts(prev => {
      const next = prev.map(s => {
        if (s.id !== scriptId) return s;
        const platforms = s.platforms.includes(p)
          ? s.platforms.filter(x => x !== p)
          : [...s.platforms, p];
        return { ...s, platforms: platforms.length > 0 ? platforms : [p], updatedAt: today() };
      });
      saveScripts(next);
      return next;
    });
  }

  function handleGenerateAI(script: GongguScript) {
    if (!script.experience?.trim()) {
      setGenerateError("체험 포인트를 먼저 입력해주세요. 입력한 경험을 녹여서 초안을 만들어드려요.");
      return;
    }

    setGenerateError(null);
    setGeneratingId(script.id);

    try {
      const s = generateScriptLocal(
        {
          productName: script.productName,
          originalPrice: script.originalPrice,
          gongguPrice: script.gongguPrice,
          gongguStart: script.gongguStart,
          gongguEnd: script.gongguEnd,
        },
        {
          experience: script.experience,
          target: script.target,
          tone: script.tone,
        },
        script.format
      ) as unknown as Record<string, string>;

      setScripts(prev => {
        const next = prev.map(x => {
          if (x.id !== script.id) return x;
          return {
            ...x,
            hook: s.hook ?? x.hook,
            intro: s.intro ?? x.intro,
            benefits: s.benefits ?? x.benefits,
            dealInfo: s.dealInfo ?? x.dealInfo,
            cta: s.cta ?? x.cta,
            core: s.core ?? x.core,
            opening: s.opening ?? x.opening,
            body: s.body ?? x.body,
            hashtags: s.hashtags ?? x.hashtags,
            updatedAt: today(),
          };
        });
        saveScripts(next);
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "생성 실패";
      setGenerateError(msg);
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">공구 스크립트</h2>
          <p className="mt-1 text-sm text-gray-500">
            카페24 상품을 선택하고 AI가 공구 스크립트를 생성해드려요
          </p>
        </div>
        <button
          onClick={() => setShowProductPicker(true)}
          className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a51919] transition-colors"
        >
          + 상품 선택
        </button>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">작성중</p>
          <p className="mt-1 text-2xl font-bold text-gray-400">{counts.draft}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">준비완료</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{counts.ready}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">공구중</p>
          <p className="mt-1 text-2xl font-bold text-[#C41E1E]">{counts.published}개</p>
        </div>
      </div>

      {/* ── 상품 선택 + 포맷 선택 모달 ── */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-xl flex flex-col mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">
                {pendingProduct ? "포맷 선택" : "카페24 상품 선택"}
              </h3>
              <button
                onClick={() => { setShowProductPicker(false); setPendingProduct(null); }}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!pendingProduct ? (
              <>
                {/* 검색 */}
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={e => setSearchKeyword(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") fetchProducts(searchKeyword); }}
                      placeholder="상품명으로 검색..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E]"
                    />
                    <button
                      onClick={() => fetchProducts(searchKeyword)}
                      className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#a51919]"
                    >
                      검색
                    </button>
                  </div>
                </div>

                {/* 상품 리스트 */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                  {productsLoading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#C41E1E]" />
                      <span className="ml-3 text-sm text-gray-500">상품 불러오는 중...</span>
                    </div>
                  )}

                  {productsError && (
                    <div className="rounded-lg bg-red-50 p-4 text-center">
                      <p className="text-sm text-red-600">{productsError}</p>
                      <button
                        onClick={() => fetchProducts()}
                        className="mt-2 cursor-pointer text-sm font-medium text-[#C41E1E] hover:underline"
                      >
                        다시 시도
                      </button>
                    </div>
                  )}

                  {!productsLoading && !productsError && cafe24Products.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">상품이 없습니다</div>
                  )}

                  <div className="space-y-2">
                    {cafe24Products.map(product => {
                      const name = product.product_name.replace(/<[^>]*>/g, "").trim();
                      const price = parseFloat(product.price) || 0;
                      const imgSrc = product.list_image || product.small_image || product.detail_image || "";

                      return (
                        <button
                          key={product.product_no}
                          onClick={() => handlePickProduct(product)}
                          className="cursor-pointer w-full flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
                        >
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={name}
                              className="h-14 w-14 rounded-lg object-cover shrink-0 border border-gray-100"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <span className="text-lg text-gray-300">📦</span>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatPrice(price)}원
                              {product.selling === "T" ? (
                                <span className="ml-2 text-green-500">판매중</span>
                              ) : (
                                <span className="ml-2 text-gray-400">미판매</span>
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 포맷 선택 단계 */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {pendingProduct.list_image && (
                      <img
                        src={pendingProduct.list_image}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover border border-gray-100"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {pendingProduct.product_name.replace(/<[^>]*>/g, "").trim()}
                      </p>
                      <p className="text-xs text-gray-500">어떤 포맷으로 대본을 만들까요?</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="grid gap-3">
                    {(Object.keys(FORMAT_META) as ScriptFormat[]).map(fmt => {
                      const meta = FORMAT_META[fmt];
                      const selected = pendingFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          onClick={() => setPendingFormat(fmt)}
                          className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-colors ${
                            selected
                              ? "border-[#C41E1E] bg-red-50/30"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{meta.icon}</span>
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${selected ? "text-[#C41E1E]" : "text-gray-900"}`}>
                                {meta.label}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                            </div>
                            {selected && (
                              <svg className="h-5 w-5 text-[#C41E1E] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-gray-200 px-5 py-3">
                  <button
                    onClick={() => setPendingProduct(null)}
                    className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    ← 상품 다시 선택
                  </button>
                  <button
                    onClick={handleConfirmPendingProduct}
                    className="cursor-pointer flex-1 rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a51919]"
                  >
                    {FORMAT_META[pendingFormat].label}로 시작하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 필터 ── */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {([
          { key: "all" as const, label: "전체" },
          { key: "draft" as const, label: "작성중" },
          { key: "ready" as const, label: "준비완료" },
          { key: "published" as const, label: "공구중" },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === f.key ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-gray-200 self-center" />
        {(["all", "longform", "shorts", "post"] as const).map(f => {
          const label = f === "all" ? "전체 포맷" : FORMAT_META[f].label;
          return (
            <button
              key={f}
              onClick={() => setFilterFormat(f)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filterFormat === f ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── 스크립트 리스트 ── */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">
              {scripts.length === 0 ? "카페24 상품을 선택해서 공구 스크립트를 만들어 보세요" : "해당 조건의 스크립트가 없습니다"}
            </p>
            {scripts.length === 0 && (
              <button
                onClick={() => setShowProductPicker(true)}
                className="mt-2 cursor-pointer text-sm font-medium text-[#C41E1E] hover:underline"
              >
                + 상품 선택하기
              </button>
            )}
          </div>
        )}

        {filtered.map(script => {
          const isExpanded = expandedId === script.id;
          const isEditing = editingId === script.id;
          const badge = statusBadge(script.status);
          const discount = discountRate(script.originalPrice, script.gongguPrice);
          const sections = SECTIONS_BY_FORMAT[script.format];
          const filledSections = sections.filter(sec => (script as unknown as Record<string, string>)[sec.key]);
          const formatMeta = FORMAT_META[script.format];
          const isGenerating = generatingId === script.id;

          return (
            <div key={script.id} className={`rounded-xl border bg-white transition-all ${isEditing ? "border-[#C41E1E]/40 shadow-sm" : "border-gray-200"}`}>
              {/* 카드 헤더 */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {script.productImage ? (
                    <img
                      src={script.productImage}
                      alt={script.productName}
                      className="h-14 w-14 rounded-lg object-cover shrink-0 border border-gray-100"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-lg text-gray-300">📦</span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.style}`}>
                        {badge.label}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                        {formatMeta.icon} {formatMeta.label}
                      </span>
                      {script.platforms.map(p => (
                        <span key={p} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${platformColor(p)}`}>
                          {platformIcon(p)}
                        </span>
                      ))}
                      <span className="text-[11px] text-gray-400">수정 {script.updatedAt}</span>
                    </div>

                    <h4 className="mt-1.5 text-sm font-semibold text-gray-900">{script.productName}</h4>

                    {script.originalPrice > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        {discount > 0 && (
                          <span className="text-xs text-gray-400 line-through">{formatPrice(script.originalPrice)}원</span>
                        )}
                        <span className="text-sm font-bold text-[#C41E1E]">{formatPrice(script.gongguPrice)}원</span>
                        {discount > 0 && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#C41E1E]">
                            {discount}%
                          </span>
                        )}
                      </div>
                    )}

                    {script.gongguStart && script.gongguEnd && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        공구 기간: {script.gongguStart} ~ {script.gongguEnd}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#C41E1E] rounded-full transition-all"
                          style={{ width: `${(filledSections.length / sections.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {filledSections.length}/{sections.length} 섹션
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => { setExpandedId(isExpanded ? null : script.id); if (!isExpanded) setEditingId(null); }}
                      className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      {isExpanded ? "접기" : "보기"}
                    </button>
                    {isExpanded && (
                      <button
                        onClick={() => handleCopyScript(script)}
                        className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        {copied === script.id ? "✓ 복사됨" : "복사"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 펼친 상태 */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="flex items-center justify-between py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingId(isEditing ? null : script.id)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isEditing ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {isEditing ? "편집중" : "편집"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">상태:</span>
                      <select
                        value={script.status}
                        onChange={e => handleStatusChange(script.id, e.target.value as ScriptStatus)}
                        className="cursor-pointer rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-[#C41E1E] focus:outline-none"
                      >
                        <option value="draft">작성중</option>
                        <option value="ready">준비완료</option>
                        <option value="published">공구중</option>
                      </select>
                      <button
                        onClick={() => handleDelete(script.id)}
                        className="cursor-pointer rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 초안 생성 버튼 */}
                  {isEditing && (
                    <div className="mb-4 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-purple-800">📝 대본 초안 생성</p>
                        <span className="text-[10px] text-purple-500">체험 포인트 + 가격 → 즉시 초안 생성</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-1">
                            체험 포인트 <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={script.experience}
                            onChange={e => handleSectionEdit(script.id, "experience", e.target.value)}
                            placeholder="예: 3개월 써봤는데 피부 속당김이 확실히 줄었어요. 특히 아침에 붓기가 덜해요. 기존에 쓰던 A 제품보다 발림성이 가볍고..."
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-y"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">타겟</label>
                            <input
                              type="text"
                              value={script.target}
                              onChange={e => handleSectionEdit(script.id, "target", e.target.value)}
                              placeholder="예: 30대 워킹맘"
                              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">톤</label>
                            <select
                              value={script.tone}
                              onChange={e => handleSectionEdit(script.id, "tone", e.target.value)}
                              className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-400 focus:outline-none"
                            >
                              <option value="친근">친근</option>
                              <option value="전문">전문</option>
                              <option value="유머">유머</option>
                              <option value="공감">공감</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={() => handleGenerateAI(script)}
                          disabled={isGenerating}
                          className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-[#C41E1E] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                          {isGenerating ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              생성 중...
                            </span>
                          ) : (
                            `📝 ${FORMAT_META[script.format].label} 초안 생성`
                          )}
                        </button>

                        {generateError && generatingId === null && (
                          <p className="text-xs text-red-600">{generateError}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 플랫폼 선택 */}
                  {isEditing && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">게시 플랫폼</label>
                      <div className="flex gap-2">
                        {(["youtube", "instagram", "tiktok"] as Platform[]).map(p => (
                          <button
                            key={p}
                            onClick={() => togglePlatform(script.id, p)}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              script.platforms.includes(p) ? platformColor(p) : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {platformIcon(p)} {platformLabel(p)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 스크립트 섹션들 (format별 분기) */}
                  <div className="space-y-4">
                    {sections.map(sec => {
                      const value = (script as unknown as Record<string, string>)[sec.key] ?? "";
                      return (
                        <div key={sec.key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            {sec.label}
                          </label>
                          {isEditing ? (
                            <textarea
                              value={value}
                              onChange={e => handleSectionEdit(script.id, sec.key, e.target.value)}
                              placeholder={sec.placeholder}
                              rows={sec.key === "memo" ? 2 : (sec.key === "body" || sec.key === "benefits" ? 5 : 3)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E] resize-y"
                            />
                          ) : (
                            <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                              value ? "bg-gray-50 text-gray-800" : "bg-gray-50 text-gray-300 italic"
                            }`}>
                              {value || sec.placeholder}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 공구 정보 편집 */}
                  {isEditing && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">공구 정보</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">정가 (원)</label>
                          <input
                            type="number"
                            value={script.originalPrice || ""}
                            onChange={e => handleFieldEdit(script.id, "originalPrice", parseInt(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">공구가 (원)</label>
                          <input
                            type="number"
                            value={script.gongguPrice || ""}
                            onChange={e => handleFieldEdit(script.id, "gongguPrice", parseInt(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">공구 시작일</label>
                          <input
                            type="date"
                            value={script.gongguStart || ""}
                            onChange={e => handleFieldEdit(script.id, "gongguStart", e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">공구 종료일</label>
                          <input
                            type="date"
                            value={script.gongguEnd || ""}
                            onChange={e => handleFieldEdit(script.id, "gongguEnd", e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 하단 팁 ── */}
      <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-2">대본 초안 생성 팁</p>
        <ul className="space-y-1.5 text-[11px] text-gray-500">
          <li className="flex gap-2"><span className="text-[#C41E1E]">1.</span> <b>체험 포인트</b>는 문장 단위로 쪼개서 — 마침표·쉼표로 구분되어 장점 bullet이 돼요</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">2.</span> <b>"3개월 써봤는데"</b> 같이 기간을 포함하면 대본에 자동 반영됩니다</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">3.</span> <b>공구가·기간</b>을 먼저 채우면 가격·할인율·마감일이 정확히 들어가요</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">4.</span> 생성된 초안은 뼈대일 뿐 — 본인 말투·시그니처로 다듬는 걸 꼭 해주세요</li>
        </ul>
      </div>
    </div>
  );
}
