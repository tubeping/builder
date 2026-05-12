"use client";

/**
 * 로그인 페이지 — 재방문자 전용
 * 신규 가입은 /signup (약관 동의 필수)
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleGoogle = async () => {
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) { setErr(error.message); setLoading(false); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로그인 실패");
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErr(translateAuthError(error.message));
        setLoading(false);
        void fetch("/api/auth/log-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(), event_type: "login_failed", method: "email",
            error_message: error.message,
          }),
        }).catch(() => {});
        return;
      }
      // 이메일 로그인 성공 로그 (Google은 callback에서 처리)
      void fetch("/api/auth/log-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), event_type: "login_success", method: "email" }),
      }).catch(() => {});
      router.push(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로그인 실패");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#C41E1E]">Tube</span>
              <span className="text-gray-900">Ping</span>
            </span>
          </a>
          <p className="mt-2 text-sm text-gray-500">크리에이터 스튜디오 로그인</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="cursor-pointer flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <GoogleIcon />
            Google로 계속하기
          </button>

          {/* 구분선 */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] text-gray-400 uppercase">또는</span></div>
          </div>

          {/* 이메일 폼 */}
          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">이메일</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">비밀번호</label>
                <a href="/forgot-password" className="text-[10px] text-[#C41E1E] hover:underline">잊으셨나요?</a>
              </div>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <button
              type="submit" disabled={loading || !email.trim() || !password}
              className="cursor-pointer w-full rounded-xl bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#c92e3a] disabled:opacity-50"
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          아직 계정이 없으신가요?{" "}
          <a href="/signup" className="font-bold text-[#C41E1E] hover:underline">회원가입</a>
        </p>

        <div className="mt-8 text-center text-[10px] text-gray-400 space-x-3">
          <a href="/terms" className="hover:underline">이용약관</a>
          <span>·</span>
          <a href="/privacy" className="hover:underline">개인정보처리방침</a>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-3.5 5.5-6 9.7-6 3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3c-2 1.5-4.6 2.5-7.5 2.5-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.5 5.3C40.6 36.7 44 30.9 44 24c0-1.3-.1-2.6-.4-3.5z"/>
    </svg>
  );
}

function translateAuthError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않습니다";
  if (/Email not confirmed/i.test(msg)) return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요";
  if (/User not found/i.test(msg)) return "가입된 계정이 없습니다";
  if (/rate limit/i.test(msg)) return "잠시 후 다시 시도해주세요";
  return msg;
}
