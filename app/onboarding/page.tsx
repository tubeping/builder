"use client";

/**
 * 온보딩 — OAuth/이메일 가입 직후 진입.
 *
 * 흐름:
 *   1. 인증 확인 (미인증 → /login)
 *   2. shop_slug 있으면 → /dashboard로 즉시 (이미 온보딩 완료)
 *   3. shop_slug 없으면 → 채널 정보 입력 폼 표시
 *   4. 저장 후 → /dashboard
 *
 * 입력 필드: 이름, 활동 플랫폼, 채널 URL, 카테고리, shop_slug
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const CATEGORIES = ["식품", "뷰티/화장품", "패션/의류", "생활/건강", "디지털/가전", "주방용품", "가구/인테리어", "유아동", "반려동물", "스포츠/레저", "여행/캠핑", "기타"];
const PLATFORMS = [
  { value: "youtube", label: "YouTube", icon: "🎬" },
  { value: "instagram", label: "Instagram", icon: "📷" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "blog", label: "블로그", icon: "📝" },
  { value: "etc", label: "기타", icon: "🔗" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "form" | "saving" | "done">("checking");

  // 폼 상태
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [error, setError] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"" | "available" | "taken" | "invalid">("");

  // 1) 인증 + 기존 온보딩 완료 여부 확인
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (!alive) return;
        if (!user) {
          router.replace("/login?next=/onboarding");
          return;
        }

        // /api/me에서 기존 creator 정보 확인
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const me = await meRes.json();
          // 이미 shop_slug 있으면 온보딩 완료된 사용자
          if (me.shop_slug && !me.shop_slug.match(/^[a-z0-9]+_[a-f0-9]{4}$/)) {
            // 자동 생성된 임시 slug(email_hash 형태) 아니면 완료된 것
            router.replace("/dashboard");
            return;
          }
          // 자동 생성된 임시 slug거나 슬러그 없으면 폼 표시
          setName(me.name || user.user_metadata?.name || user.email?.split("@")[0] || "");
          setPlatform(me.platform || "youtube");
          setChannelUrl(me.channel_url || "");
          setCategory(me.category || "");
          // 임시 slug면 비워두고 사용자가 새로 정하게
          if (me.shop_slug && me.shop_slug.match(/^[a-z0-9]+_[a-f0-9]{4}$/)) {
            setShopSlug("");
          } else {
            setShopSlug(me.shop_slug || "");
          }
        } else {
          setName(user.user_metadata?.name || user.email?.split("@")[0] || "");
        }

        setPhase("form");
      } catch {
        setPhase("form");
      }
    })();
    return () => { alive = false; };
  }, [router]);

  // shop_slug 형식 검증 + 중복 체크 (debounced)
  useEffect(() => {
    if (!shopSlug) { setSlugStatus(""); return; }
    if (!/^[a-z0-9_-]{3,30}$/.test(shopSlug)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      try {
        // 공개 몰 페이지가 응답하면 이미 사용 중 (확실하진 않지만 빠른 휴리스틱)
        const res = await fetch(`/api/me/check-slug?slug=${encodeURIComponent(shopSlug)}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setSlugStatus(data.available ? "available" : "taken");
        } else {
          setSlugStatus("");
        }
      } catch {
        setSlugStatus("");
      } finally {
        setSlugChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [shopSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("이름을 입력해주세요"); return; }
    if (!shopSlug) { setError("쇼핑몰 슬러그를 입력해주세요"); return; }
    if (slugStatus === "invalid") { setError("슬러그는 영문 소문자·숫자·하이픈·언더스코어 3~30자"); return; }
    if (slugStatus === "taken") { setError("이미 사용 중인 슬러그입니다"); return; }
    if (!category) { setError("카테고리를 선택해주세요"); return; }

    setPhase("saving"); setError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          platform,
          channel_url: channelUrl.trim(),
          category,
          shop_slug: shopSlug.toLowerCase(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "저장 실패");
        setPhase("form");
        return;
      }
      setPhase("done");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setPhase("form");
    }
  };

  // ─── 렌더 ───

  if (phase === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
          <p className="mt-3 text-sm text-gray-500">잠시만요…</p>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">🎉</div>
          <p className="text-base font-bold text-gray-900">설정 완료!</p>
          <p className="mt-1 text-sm text-gray-500">대시보드로 이동합니다…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF7] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-gray-900">Ping</span>
          </span>
          <p className="mt-2 text-sm text-gray-500">시작 전 채널 정보를 알려주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {/* 이름 */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">이름 / 채널명 <span className="text-[#C41E1E]">*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="예: 귀빈정"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>

          {/* 활동 플랫폼 */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">주 활동 플랫폼 <span className="text-[#C41E1E]">*</span></label>
            <div className="grid grid-cols-5 gap-1.5">
              {PLATFORMS.map((p) => (
                <button key={p.value} type="button" onClick={() => setPlatform(p.value)}
                  className={`cursor-pointer rounded-lg border py-2 text-[11px] font-medium transition-colors flex flex-col items-center gap-0.5 ${
                    platform === p.value ? "border-[#C41E1E] bg-[#FFF0F0] text-[#C41E1E]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  <span className="text-base">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 채널 URL */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              채널 URL <span className="text-gray-400 font-normal text-[10px]">(선택)</span>
            </label>
            <input type="url" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://youtube.com/@..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">주 카테고리 <span className="text-[#C41E1E]">*</span></label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    category === c ? "border-[#C41E1E] bg-[#FFF0F0] text-[#C41E1E]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* shop_slug */}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">쇼핑몰 주소 <span className="text-[#C41E1E]">*</span></label>
            <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:border-[#C41E1E]">
              <span className="bg-gray-50 px-3 py-2.5 text-xs text-gray-400 border-r border-gray-200">tubepingbuilder.vercel.app/shop/</span>
              <input type="text" required value={shopSlug}
                onChange={(e) => setShopSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="my-shop"
                className="flex-1 px-3 py-2.5 text-sm outline-none" />
              <span className="px-3 text-[10px]">
                {slugChecking && <span className="text-gray-400">확인 중…</span>}
                {!slugChecking && slugStatus === "available" && <span className="text-green-600 font-bold">✓ 사용 가능</span>}
                {!slugChecking && slugStatus === "taken" && <span className="text-red-500">사용 중</span>}
                {!slugChecking && slugStatus === "invalid" && <span className="text-amber-600">형식 오류</span>}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">영문 소문자·숫자·하이픈·언더스코어 3~30자</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button type="submit" disabled={phase === "saving" || slugStatus === "taken" || slugStatus === "invalid"}
            className="cursor-pointer w-full rounded-xl bg-[#C41E1E] py-3 text-sm font-bold text-white hover:bg-[#A01818] disabled:opacity-40">
            {phase === "saving" ? "저장 중…" : "튜핑 시작하기"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          나중에 설정 메뉴에서 언제든 변경할 수 있어요.
        </p>
      </div>
    </main>
  );
}
