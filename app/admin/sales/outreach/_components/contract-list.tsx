"use client";

import { useState } from "react";

type Contract = {
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
  contactEmail: string;
  contactPerson: string;
  contractDate: string;
  storeUrl: string;
  status: "active" | "building" | "paused" | "terminated";
  monthlyRevenue: number | null;
  revenueShare: string;
  memo: string;
};

const CONTRACTS: Contract[] = [
  {
    channelName: "신사임당",
    channelUrl: "https://www.youtube.com/@shinsaimdang",
    subscriberCount: 2700000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2026-02-01",
    storeUrl: "(구축 중)",
    status: "building",
    monthlyRevenue: null,
    revenueShare: "7:3",
    memo: "쇼핑몰 구축 중",
  },
  {
    channelName: "코믹마트",
    channelUrl: "https://www.youtube.com/@comicmart",
    subscriberCount: 1000000,
    contactEmail: "bbh1985@naver.com",
    contactPerson: "백승훈",
    contractDate: "2025-06-01",
    storeUrl: "www.comicmart.kr",
    status: "active",
    monthlyRevenue: 12000000,
    revenueShare: "7:3",
    memo: "PB 콘돔 상품 기획 중",
  },
  {
    channelName: "E트렌드",
    channelUrl: "https://www.youtube.com/@E_TREND",
    subscriberCount: 720000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2025-05-01",
    storeUrl: "www.etrendmall.com",
    status: "active",
    monthlyRevenue: 8500000,
    revenueShare: "7:3",
    memo: "",
  },
  {
    channelName: "떠먹여주는TV",
    channelUrl: "https://www.youtube.com/@scoopfeedTV",
    subscriberCount: 670000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2025-09-01",
    storeUrl: "https://scoopmarket.co.kr",
    status: "active",
    monthlyRevenue: 6200000,
    revenueShare: "7:3",
    memo: "",
  },
  {
    channelName: "킬링타임",
    channelUrl: "https://www.youtube.com/@killingtime",
    subscriberCount: 550000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2025-06-01",
    storeUrl: "www.killingtime.kr",
    status: "active",
    monthlyRevenue: 4800000,
    revenueShare: "7:3",
    memo: "",
  },
  {
    channelName: "줌인센타",
    channelUrl: "https://www.youtube.com/@zOOm.in.center",
    subscriberCount: 500000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2025-07-01",
    storeUrl: "www.zoomcen.store",
    status: "active",
    monthlyRevenue: 3500000,
    revenueShare: "7:3",
    memo: "",
  },
  {
    channelName: "누기",
    channelUrl: "https://www.youtube.com/@gnooq",
    subscriberCount: 300000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2025-08-01",
    storeUrl: "www.gnooq.com",
    status: "active",
    monthlyRevenue: 2800000,
    revenueShare: "7:3",
    memo: "틱톡 130만",
  },
  {
    channelName: "희예",
    channelUrl: "https://www.youtube.com/@heeyea",
    subscriberCount: 210000,
    contactEmail: "",
    contactPerson: "",
    contractDate: "2025-10-01",
    storeUrl: "www.희예스토어.shop",
    status: "active",
    monthlyRevenue: 1500000,
    revenueShare: "7:3",
    memo: "",
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "운영 중", color: "bg-green-100 text-green-700" },
  building: { label: "구축 중", color: "bg-blue-100 text-blue-700" },
  paused: { label: "일시 중지", color: "bg-yellow-100 text-yellow-700" },
  terminated: { label: "해지", color: "bg-red-100 text-red-700" },
};

function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

function formatRevenue(n: number | null): string {
  if (n === null) return "-";
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

export default function ContractList() {
  const [contracts] = useState<Contract[]>(CONTRACTS);

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const buildingCount = contracts.filter((c) => c.status === "building").length;
  const totalRevenue = contracts.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0);
  const totalSubscribers = contracts.reduce((sum, c) => sum + c.subscriberCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">계약 채널</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{contracts.length}</p>
          <p className="text-xs mt-1">
            <span className="text-green-600 font-medium">운영 {activeCount}</span>
            {buildingCount > 0 && (
              <span className="text-blue-600 font-medium ml-2">구축 {buildingCount}</span>
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">총 구독자</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalSubscribers)}</p>
          <p className="text-xs text-gray-400 mt-1">전체 파트너 합산</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">월 매출 합계</p>
          <p className="text-2xl font-bold text-[#C41E1E] mt-1">{formatRevenue(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">운영 중 채널 기준</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">평균 채널 매출</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {activeCount > 0 ? formatRevenue(Math.round(totalRevenue / activeCount)) : "-"}
          </p>
          <p className="text-xs text-gray-400 mt-1">운영 중 채널 평균</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">파트너 채널 목록</h2>
          <button className="px-4 py-2 bg-[#C41E1E] text-white text-xs font-medium rounded-lg hover:bg-[#A01818] cursor-pointer">
            + 신규 계약 등록
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-50">
              <th className="text-left px-6 py-3 font-medium">채널명</th>
              <th className="text-right px-3 py-3 font-medium">구독자</th>
              <th className="text-left px-3 py-3 font-medium">스토어</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-right px-3 py-3 font-medium">월 매출</th>
              <th className="text-center px-3 py-3 font-medium">정산비율</th>
              <th className="text-left px-3 py-3 font-medium">계약일</th>
              <th className="text-left px-6 py-3 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr
                key={c.channelName}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-6 py-3">
                  <p className="text-sm font-medium text-gray-900">{c.channelName}</p>
                  {c.contactPerson && (
                    <p className="text-xs text-gray-400">{c.contactPerson}</p>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-700 text-right">
                  {formatNumber(c.subscriberCount)}
                </td>
                <td className="px-3 py-3 text-sm">
                  {c.storeUrl.startsWith("(") ? (
                    <span className="text-gray-400">{c.storeUrl}</span>
                  ) : (
                    <span className="text-blue-600">{c.storeUrl}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[c.status].color}`}
                  >
                    {STATUS_CONFIG[c.status].label}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-right font-medium">
                  {c.monthlyRevenue ? (
                    <span className="text-gray-900">{formatRevenue(c.monthlyRevenue)}</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500 text-center">{c.revenueShare}</td>
                <td className="px-3 py-3 text-sm text-gray-500">{c.contractDate}</td>
                <td className="px-6 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                  {c.memo || <span className="text-gray-300">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
