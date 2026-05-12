"use client";

/**
 * 2FA 코드 입력 페이지 — 로그인 시 MFA가 활성화된 사용자에게 표시.
 *
 * 흐름:
 *   /login에서 signInWithPassword 성공 (AAL1 세션)
 *   → MFA 활성 확인 → /verify-mfa로 redirect
 *   → 사용자 6자리 코드 입력
 *   → mfa.challenge + mfa.verify (AAL2 세션 업그레이드)
 *   → /dashboard
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

function VerifyMfaInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) {
        router.replace("/login?next=" + encodeURIComponent(next));
        return;
      }
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp || []).find((f) => f.status === "verified");
      if (!verified) {
        // MFA 미활성 — 바로 next로
        router.replace(next);
        return;
      }
      setFactorId(verified.id);
      setPhase("ready");
    })();
    return () => { alive = false; };
  }, [router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setErr("6자리 숫자 코드를 입력해주세요");
      return;
    }
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) { setErr(chErr.message); setLoading(false); return; }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: challenge.id, code,
      });
      if (vErr) { setErr("코드가 일치하지 않아요. 다시 시도해주세요"); setLoading(false); return; }
      router.push(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#C41E1E]">Tube</span>
              <span className="text-gray-900">Ping</span>
            </span>
          </a>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          {phase === "checking" ? (
            <div className="text-center py-6">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
              <p className="mt-3 text-xs text-gray-500">확인 중…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <span className="text-3xl">🔐</span>
                <h2 className="mt-2 text-base font-bold text-gray-900">2단계 인증</h2>
                <p className="mt-1 text-xs text-gray-500">OTP 앱에서 6자리 코드를 확인하세요</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="text" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" maxLength={6} autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-lg font-mono tracking-[0.3em] outline-none focus:border-[#C41E1E]" />
                {err && <p className="text-xs text-red-600 text-center">{err}</p>}
                <button type="submit" disabled={loading || code.length !== 6}
                  className="cursor-pointer w-full rounded-xl bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#A01818] disabled:opacity-40">
                  {loading ? "확인 중…" : "확인"}
                </button>
              </form>

              <p className="mt-4 text-center text-[10px] text-gray-400">
                OTP 앱이 없으신가요? <a href="mailto:master@shinsananalytics.com" className="text-[#C41E1E] underline">고객센터</a>에 문의하세요.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyMfaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" /></div>}>
      <VerifyMfaInner />
    </Suspense>
  );
}
