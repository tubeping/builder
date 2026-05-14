"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserSearch,
  Palette,
  Package,
  Sparkles,
  Link2,
  PenLine,
  MessageSquare,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import MyPicks from "./_components/MyPicks";
import ProductRecommend from "./_components/ProductRecommend";
import Partners from "./_components/Partners";
import ShopCustomize from "./_components/ShopCustomize";
import ContentAnalytics from "./_components/ContentAnalytics";
import AutoDM from "./_components/AutoDM";
import Earnings from "./_components/Earnings";
import FanInsights from "./_components/FanInsights";
import ReelAnalyzer from "./_components/ReelAnalyzer";
import Settings from "./_components/Settings";
import Stats from "./_components/Stats";
import AdminPanel from "./_components/AdminPanel";
import { isAdminRole } from "@/lib/auth-roles";

type MenuKey =
  | "persona"
  | "profile"
  | "picks"
  | "recommend"
  | "partners"
  | "script"
  | "autodm"
  | "finance"
  | "settings"
  | "admin";

interface MenuItem { key: MenuKey; label: string; icon: LucideIcon; adminOnly?: boolean }
interface MenuSection { id: string; label: string; items: MenuItem[] }

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "persona",
    label: "1. 페르소나 도출",
    items: [{ key: "persona", label: "페르소나 도출", icon: UserSearch }],
  },
  {
    id: "profile",
    label: "2. 프로필",
    items: [{ key: "profile", label: "프로필", icon: Palette }],
  },
  {
    id: "products",
    label: "3. 상품 관리",
    items: [
      { key: "picks", label: "내 상품 관리", icon: Package },
      { key: "recommend", label: "상품 추천", icon: Sparkles },
      { key: "partners", label: "파트너스", icon: Link2 },
    ],
  },
  {
    id: "script",
    label: "4. 공구 스크립트",
    items: [{ key: "script", label: "공구 스크립트", icon: PenLine }],
  },
  {
    id: "manage",
    label: "5. 관리",
    items: [
      { key: "autodm", label: "자동응답", icon: MessageSquare },
      { key: "finance", label: "정산·통계", icon: BarChart3 },
      { key: "settings", label: "설정", icon: SettingsIcon },
    ],
  },
  {
    id: "admin",
    label: "관리자",
    items: [{ key: "admin", label: "관리자", icon: ShieldCheck, adminOnly: true }],
  },
];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("persona");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // role 로드 (admin 메뉴 노출 여부)
  useEffect(() => {
    fetch("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setUserRole(d.role); })
      .catch(() => { /* 무시 */ });
  }, []);

  // role 기반 섹션·메뉴 필터링
  const visibleSections = MENU_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.adminOnly || isAdminRole(userRole)),
    }))
    .filter(section => section.items.length > 0);

  const content: Record<MenuKey, React.ReactNode> = {
    persona: (
      <div className="space-y-8 p-4 md:p-8">
        <FanInsights />
        <ReelAnalyzer />
      </div>
    ),
    profile: <ShopCustomize />,
    picks: <MyPicks />,
    recommend: <ProductRecommend />,
    partners: <Partners />,
    script: <ContentAnalytics />,
    autodm: <AutoDM />,
    finance: (
      <div className="space-y-8 p-4 md:p-8">
        <Earnings />
        <Stats />
      </div>
    ),
    settings: <Settings />,
    admin: <AdminPanel />,
  };

  const activeLabel = MENU_SECTIONS
    .flatMap(s => s.items)
    .find(m => m.key === activeMenu);

  const ActiveIcon = activeLabel?.icon;

  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        void fetch("/api/auth/log-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, event_type: "logout" }),
        }).catch(() => {});
      }
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  };

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
          {visibleSections.map((section) => (
            <div key={section.id} className="py-1">
              <div className="px-5 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {section.label}
              </div>
              {section.items.map((item) => {
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
            </div>
          ))}
          <a
            href="/shop/gwibinjeong"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-bold text-white active:bg-gray-800"
          >
            내 쇼핑몰 보기
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mx-4 mt-2 mb-3 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "로그아웃 중…" : "로그아웃"}
          </button>
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
        <nav className="flex flex-col gap-0.5 px-3 mt-3 flex-1 overflow-y-auto">
          {visibleSections.map((section) => (
            <div key={section.id} className="mb-3">
              <div className="px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {section.label}
              </div>
              {section.items.map((item) => {
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
            </div>
          ))}
        </nav>

        {/* 내 쇼핑몰 보기 */}
        <div className="px-4 pb-5 pt-4 border-t border-gray-100 space-y-2">
          <a
            href="/shop/gwibinjeong"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-[13px] font-bold text-white hover:bg-gray-800 transition-colors"
          >
            내 쇼핑몰 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "로그아웃 중…" : "로그아웃"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[#F7F7F8] overflow-y-auto">{content[activeMenu]}</main>
    </div>
  );
}
