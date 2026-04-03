"use client";

import { useState, useEffect } from "react";

/* ── 타입 ── */

type Variant = {
  variant_code: string;
  options: { name: string; value: string }[];
  price: string;
  display: string;
  selling: string;
  quantity: number;
};

type ProductDetail = {
  product_no: number;
  product_code: string;
  product_name: string;
  price: string;
  supply_price: string;
  retail_price: string;
  selling: string;
  sold_out: string;
  detail_image: string;
  list_image: string;
  small_image: string;
  simple_description: string;
  description: string;
  summary_description: string;
  shipping_scope: string;
  shipping_fee_type: string;
  shipping_fee: string;
  shipping_rates: string;
  prepaid_shipping_fee: string;
  clearance_category_code: string;
  product_weight: string;
  options: { name: string; value: string[] }[];
  variants: Variant[];
  created_date: string;
  updated_date: string;
};

type Props = {
  productNo: number;
  onClose: () => void;
  onSaved: () => void;
};

/* ── 유틸 ── */

function formatPrice(s: string): string {
  const n = Number(s);
  if (isNaN(n)) return s;
  return n.toLocaleString();
}

const SHIPPING_FEE_TYPES: Record<string, string> = {
  T: "무료",
  R: "고정",
  M: "조건부 무료",
  D: "수량별",
  W: "무게별",
  C: "금액별",
  N: "금액별 + 수량별",
};

const SHIPPING_SCOPES: Record<string, string> = {
  A: "국내",
  C: "해외",
  B: "국내+해외",
};

/* ── 컴포넌트 ── */

export default function ProductEditor({ productNo, onClose, onSaved }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [activeSection, setActiveSection] = useState<"basic" | "shipping" | "variants">("basic");

  // 편집 필드
  const [form, setForm] = useState({
    product_name: "",
    price: "",
    supply_price: "",
    retail_price: "",
    selling: "T",
    simple_description: "",
    shipping_scope: "A",
    shipping_fee_type: "T",
    shipping_fee: "0",
    prepaid_shipping_fee: "C",
  });

  const [variants, setVariants] = useState<Variant[]>([]);

  /* ── 상품 상세 로드 ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/admin/api/cafe24/products/${productNo}`);
        if (!res.ok) throw new Error(`조회 실패 (${res.status})`);
        const data = await res.json();
        const p = data.product as ProductDetail;
        setProduct(p);
        setForm({
          product_name: p.product_name || "",
          price: p.price || "0",
          supply_price: p.supply_price || "0",
          retail_price: p.retail_price || "0",
          selling: p.selling || "T",
          simple_description: p.simple_description || "",
          shipping_scope: p.shipping_scope || "A",
          shipping_fee_type: p.shipping_fee_type || "T",
          shipping_fee: p.shipping_fee || "0",
          prepaid_shipping_fee: p.prepaid_shipping_fee || "C",
        });
        setVariants(
          (p.variants || []).map((v) => ({
            variant_code: v.variant_code,
            options: v.options || [],
            price: v.price || p.price || "0",
            display: v.display || "T",
            selling: v.selling || "T",
            quantity: v.quantity ?? 0,
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "상품 조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [productNo]);

  /* ── 저장 ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const body: Record<string, unknown> = {
        product_name: form.product_name,
        price: form.price,
        supply_price: form.supply_price,
        retail_price: form.retail_price,
        selling: form.selling,
        simple_description: form.simple_description,
        shipping_scope: form.shipping_scope,
        shipping_fee_type: form.shipping_fee_type,
        shipping_fee: form.shipping_fee,
        prepaid_shipping_fee: form.prepaid_shipping_fee,
        variants: variants.map((v) => ({
          variant_code: v.variant_code,
          quantity: v.quantity,
          price: v.price,
          display: v.display,
          selling: v.selling,
        })),
      };

      const res = await fetch(`/admin/api/cafe24/products/${productNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `저장 실패 (${res.status})`);
      }

      setSaveMsg("저장 완료!");
      onSaved();
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const updateVariant = (idx: number, field: keyof Variant, value: string | number) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const img = product?.detail_image || product?.list_image || product?.small_image;
  const margin = Number(form.price) > 0
    ? (((Number(form.price) - Number(form.supply_price)) / Number(form.price)) * 100).toFixed(1)
    : "0";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-[680px] bg-white h-full overflow-y-auto shadow-xl border-l border-gray-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-900">상품 수정</h2>
            {product && (
              <span className="text-xs text-gray-400 font-mono">{product.product_code}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
            {error && <span className="text-xs text-red-500 font-medium max-w-[200px] truncate">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] disabled:opacity-50 cursor-pointer"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">로딩 중...</div>
        ) : !product ? (
          <div className="flex items-center justify-center py-20 text-red-400">{error || "상품을 찾을 수 없습니다"}</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 상품 미리보기 */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              {img ? (
                <img src={img} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center text-xs text-gray-400">No img</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900">{form.product_name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-900 font-medium">₩{formatPrice(form.price)}</span>
                  <span className="text-xs text-gray-400">공급가 ₩{formatPrice(form.supply_price)}</span>
                  <span className={`text-xs font-medium ${Number(margin) >= 30 ? "text-green-600" : Number(margin) >= 20 ? "text-blue-600" : "text-gray-500"}`}>
                    마진 {margin}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    form.selling === "T" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {form.selling === "T" ? "판매중" : "미판매"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    배리언트 {variants.length}개 · 총 재고 {variants.reduce((s, v) => s + v.quantity, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* 섹션 탭 */}
            <div className="flex gap-1 border-b border-gray-200">
              {([
                { key: "basic" as const, label: "기본 정보" },
                { key: "shipping" as const, label: "배송 정보" },
                { key: "variants" as const, label: `옵션/재고 (${variants.length})` },
              ]).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`px-4 py-2.5 text-sm font-medium cursor-pointer rounded-t-lg transition-colors ${
                    activeSection === s.key
                      ? "text-[#C41E1E] bg-white border border-gray-200 border-b-white -mb-px"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* ── 기본 정보 ── */}
            {activeSection === "basic" && (
              <div className="space-y-4">
                <Field label="상품명">
                  <input
                    type="text"
                    value={form.product_name}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-4">
                  <Field label="판매가">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400">₩</span>
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
                      />
                    </div>
                  </Field>
                  <Field label="공급가">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400">₩</span>
                      <input
                        type="number"
                        value={form.supply_price}
                        onChange={(e) => setForm({ ...form, supply_price: e.target.value })}
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
                      />
                    </div>
                  </Field>
                  <Field label="소비자가">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400">₩</span>
                      <input
                        type="number"
                        value={form.retail_price}
                        onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
                      />
                    </div>
                  </Field>
                </div>

                {/* 마진 계산 */}
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-6">
                  <div className="text-xs text-gray-500">
                    마진: <span className={`font-bold text-sm ${Number(margin) >= 30 ? "text-green-600" : Number(margin) >= 20 ? "text-blue-600" : "text-red-500"}`}>
                      {margin}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    마진액: <span className="font-bold text-sm text-gray-900">
                      ₩{(Number(form.price) - Number(form.supply_price)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Field label="판매 상태">
                  <select
                    value={form.selling}
                    onChange={(e) => setForm({ ...form, selling: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="T">판매중</option>
                    <option value="F">미판매</option>
                  </select>
                </Field>

                <Field label="간단 설명">
                  <textarea
                    value={form.simple_description}
                    onChange={(e) => setForm({ ...form, simple_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
                  />
                </Field>
              </div>
            )}

            {/* ── 배송 정보 ── */}
            {activeSection === "shipping" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="배송 범위">
                    <select
                      value={form.shipping_scope}
                      onChange={(e) => setForm({ ...form, shipping_scope: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                    >
                      {Object.entries(SHIPPING_SCOPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="배송비 유형">
                    <select
                      value={form.shipping_fee_type}
                      onChange={(e) => setForm({ ...form, shipping_fee_type: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                    >
                      {Object.entries(SHIPPING_FEE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {form.shipping_fee_type !== "T" && (
                  <Field label="배송비">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400">₩</span>
                      <input
                        type="number"
                        value={form.shipping_fee}
                        onChange={(e) => setForm({ ...form, shipping_fee: e.target.value })}
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
                      />
                    </div>
                  </Field>
                )}

                <Field label="착불/선불">
                  <select
                    value={form.prepaid_shipping_fee}
                    onChange={(e) => setForm({ ...form, prepaid_shipping_fee: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="C">착불</option>
                    <option value="P">선불</option>
                    <option value="B">착불/선불</option>
                  </select>
                </Field>
              </div>
            )}

            {/* ── 옵션/재고 ── */}
            {activeSection === "variants" && (
              <div className="space-y-4">
                {variants.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    등록된 옵션/배리언트가 없습니다.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-medium">옵션</th>
                          <th className="text-right px-3 py-3 font-medium w-28">가격</th>
                          <th className="text-right px-3 py-3 font-medium w-24">재고</th>
                          <th className="text-center px-3 py-3 font-medium w-20">진열</th>
                          <th className="text-center px-4 py-3 font-medium w-20">판매</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, idx) => (
                          <tr key={v.variant_code} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-900">
                                {v.options.length > 0
                                  ? v.options.map((o) => `${o.name}: ${o.value}`).join(" / ")
                                  : "기본"}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">{v.variant_code}</p>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={v.price}
                                onChange={(e) => updateVariant(idx, "price", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C41E1E]/30"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={v.quantity}
                                onChange={(e) => updateVariant(idx, "quantity", Number(e.target.value))}
                                className={`w-full px-2 py-1.5 text-sm text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C41E1E]/30 ${
                                  v.quantity <= 0 ? "border-red-300 bg-red-50" : v.quantity < 10 ? "border-yellow-300 bg-yellow-50" : "border-gray-200"
                                }`}
                              />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <select
                                value={v.display}
                                onChange={(e) => updateVariant(idx, "display", e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1.5 cursor-pointer focus:outline-none"
                              >
                                <option value="T">진열</option>
                                <option value="F">숨김</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <select
                                value={v.selling}
                                onChange={(e) => updateVariant(idx, "selling", e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1.5 cursor-pointer focus:outline-none"
                              >
                                <option value="T">판매</option>
                                <option value="F">중지</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* 재고 요약 */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        총 {variants.length}개 배리언트
                      </span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">
                          총 재고: <span className="font-bold text-gray-900">{variants.reduce((s, v) => s + v.quantity, 0)}</span>
                        </span>
                        {variants.some((v) => v.quantity <= 0) && (
                          <span className="text-red-500 font-medium">
                            품절 {variants.filter((v) => v.quantity <= 0).length}개
                          </span>
                        )}
                        {variants.some((v) => v.quantity > 0 && v.quantity < 10) && (
                          <span className="text-yellow-600 font-medium">
                            부족 {variants.filter((v) => v.quantity > 0 && v.quantity < 10).length}개
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 필드 래퍼 ── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
