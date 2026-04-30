"use client";

import { useState } from "react";
import {
  Inbox,
  Sparkles,
  Package,
  Link2,
  Palette,
  Share2,
  BarChart3,
  PenLine,
  MessageSquare,
  Wallet,
  Users,
  Settings as SettingsIcon,
  ExternalLink,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import CampaignInbox from "./_components/CampaignInbox";
import MyPicks from "./_components/MyPicks";
import ProductRecommend from "./_components/ProductRecommend";
import Partners from "./_components/Partners";
import ShopCustomize from "./_components/ShopCustomize";
import ContentAnalytics from "./_components/ContentAnalytics";
import AutoDM from "./_components/AutoDM";
import Earnings from "./_components/Earnings";
import FanInsights from "./_components/FanInsights";
import Settings from "./_components/Settings";
import Stats from "./_components/Stats";
import ShareLinks from "./_components/ShareLinks";

type MenuKey = "inbox" | "recommend" | "picks" | "partners" | "shop" | "share" | "stats" | "analytics" | "autodm" | "earnings" | "fans" | "settings";

const MENU_ITEMS: { key: MenuKey; label: string; icon: LucideIcon }[] = [
  { key: "inbox", label: "공구 제안함", icon: Inbox },
  { key: "recommend", label: "상품 추천", icon: Sparkles },
  { key: "picks", label: "내 PICK", icon: Package },
  { key: "partners", label: "파트너스", icon: Link2 },
  { key: "shop", label: "몰 꾸미기", icon: Palette },
  { key: "share", label: "공유 링크", icon: Share2 },
  { key: "stats", label: "통계", icon: BarChart3 },
  { key: "analytics", label: "공구 스크립트", icon: PenLine },
  { key: "autodm", label: "자동응답", icon: MessageSquare },
  { key: "earnings", label: "수익", icon: Wallet },
  { key: "fans", label: "팬 인사이트", icon: Users },
  { key: "settings", label: "설정", icon: SettingsIcon },
];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("inbox");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const content: Record<MenuKey, React.ReactNode> = {
    inbox: <CampaignInbox />,
    recommend: <ProductRecommend />,
    picks: <MyPicks />,
    partners: <Partners />,
    shop: <ShopCustomize />,
    share: <ShareLinks />,
    stats: <Stats />,
    analytics: <ContentAnalytics />,
    autodm: <AutoDM />,
    earnings: <Earnings />,
    fans: <FanInsights />,
    settings: <Settings />,
  };

  const activeLabel = MENU_ITEMS.find((m) => m.key === activeMenu);

  const ActiveIcon = activeLabel?.icon;

  return (
    <div className="flex h-screen flex-col md:flex-row bg-[#F7F7F8]">
      {/* ── 모바일 상단 바 ── */}
      <header className="flex md:hidden items-center gap-3 bg-white border-b border-gray-100 px-4 py-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="cursor-pointer text-gray-700 -ml-1 p-1"
          aria-label="메뉴"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {ActiveIcon && <ActiveIcon className="h-4 w-4 text-[#C41E1E] shrink-0" />}
          <span className="text-sm font-bold text-gray-900 truncate">{activeLabel?.label}</span>
        </div>
        <span className="ml-auto text-lg font-black tracking-tight">
          <span className="text-[#C41E1E]">Tube</span>
          <span className="text-gray-900">Ping</span>
        </span>
      </header>

      {/* ── 모바일 드롭다운 메뉴 ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 py-2">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setActiveMenu(item.key); setMobileMenuOpen(false); }}
                className={`flex w-full items-center gap-3 px-5 py-3 text-sm cursor-pointer transition-colors ${
                  active
                    ? "bg-[#FFF0F0] text-[#C41E1E] font-bold"
                    : "text-gray-700 font-medium hover:bg-gray-50"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#C41E1E]" : "text-gray-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <a
            href="/shop/gwibinjeong"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-4 my-3 flex items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-bold text-white active:bg-gray-800"
          >
            내 쇼핑몰 보기
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* ── PC 사이드바 ── */}
      <aside className="hidden md:flex w-[244px] bg-white border-r border-gray-100 flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 pt-7 pb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-black tracking-tight leading-none">
              <span className="text-[#C41E1E]">Tube</span>
              <span className="text-gray-900">Ping</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Creator Studio
          </p>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-0.5 px-3 mt-3 flex-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                className={`group relative flex items-center gap-3 text-left px-3 py-2.5 rounded-lg text-[13.5px] transition-all cursor-pointer ${
                  active
                    ? "bg-[#FFF0F0] text-[#C41E1E] font-bold"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#C41E1E]" />
                )}
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    active ? "text-[#C41E1E]" : "text-gray-400 group-hover:text-gray-700"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 내 쇼핑몰 보기 */}
        <div className="px-4 pb-5 pt-4 border-t border-gray-100">
          <a
            href="/shop/gwibinjeong"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-[13px] font-bold text-white hover:bg-gray-800 transition-colors"
          >
            내 쇼핑몰 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[#F7F7F8] overflow-y-auto">{content[activeMenu]}</main>
    </div>
  );
}
