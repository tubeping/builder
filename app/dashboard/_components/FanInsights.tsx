"use client";

// ─── 더미 데이터 ───
const STATS = {
  totalCustomers: 342,
  rebuyRate: 38,
  loyalFans: 47,
  avgOrderValue: 42800,
};

const AGE_DISTRIBUTION = [
  { label: "10대", pct: 3 },
  { label: "20대", pct: 18 },
  { label: "30대", pct: 42 },
  { label: "40대", pct: 28 },
  { label: "50+", pct: 9 },
];

const CATEGORIES = [
  { name: "건강식품", orders: 89, pct: 42 },
  { name: "생활", orders: 54, pct: 26 },
  { name: "식품", orders: 38, pct: 18 },
  { name: "뷰티", orders: 22, pct: 10 },
  { name: "기타", orders: 9, pct: 4 },
];

const TOP_FANS = [
  { id: "f1", name: "김**", orderCount: 12, totalSpent: 486000, lastOrder: "2026-04-01" },
  { id: "f2", name: "이**", orderCount: 9, totalSpent: 342000, lastOrder: "2026-03-28" },
  { id: "f3", name: "박**", orderCount: 8, totalSpent: 298000, lastOrder: "2026-03-25" },
  { id: "f4", name: "최**", orderCount: 7, totalSpent: 276000, lastOrder: "2026-03-20" },
  { id: "f5", name: "정**", orderCount: 6, totalSpent: 234000, lastOrder: "2026-03-18" },
];

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ─── 메인 컴포넌트 ───
export default function FanInsights() {
  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">팬 인사이트</h2>
        <p className="mt-1 text-sm text-gray-500">
          재구매율, 선호 카테고리, 충성팬 분석
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">전체 고객</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{STATS.totalCustomers}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">재구매율</p>
          <p className="mt-1 text-2xl font-bold text-[#C41E1E]">{STATS.rebuyRate}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">충성팬 (3회+)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{STATS.loyalFans}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">객단가</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatPrice(STATS.avgOrderValue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* 연령 분포 */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">구매자 연령 분포</h3>
          <div className="space-y-2.5">
            {AGE_DISTRIBUTION.map((age) => (
              <div key={age.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-700">{age.label}</span>
                  <span className="font-medium text-gray-900">{age.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-[#C41E1E]" style={{ width: `${age.pct * 2}%`, maxWidth: "100%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 선호 카테고리 */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">선호 카테고리</h3>
          <div className="space-y-2.5">
            {CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-700">{cat.name}</span>
                  <span className="text-gray-500">
                    {cat.orders}건 · <span className="font-medium text-gray-900">{cat.pct}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-[#111111]" style={{ width: `${cat.pct * 2}%`, maxWidth: "100%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 충성팬 TOP 5 */}
      <div className="mt-5 rounded-xl border border-gray-200 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">충성팬 TOP 5</h3>
        <div className="space-y-2">
          {TOP_FANS.map((fan, idx) => (
            <div key={fan.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C41E1E] text-xs font-bold text-white">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{fan.name}</p>
                <p className="text-xs text-gray-500">
                  {fan.orderCount}회 구매 · 마지막 주문 {fan.lastOrder}
                </p>
              </div>
              <p className="text-sm font-bold text-[#C41E1E]">{formatPrice(fan.totalSpent)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
