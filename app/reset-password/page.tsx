"use client";

/**
 * 비밀번호 재설정 페이지 — 이메일 링크 클릭 후 새 비번 입력.
 *
 * 흐름:
 *   /forgot-password에서 이메일 입력
 *   → Supabase가 메일 발송 (redirectTo=/auth/callback?next=/reset-password)
 *   → 사용자가 메일 링크 클릭
 *   → /auth/callback이 recovery code 교환 후 /reset-password로 redirect
 *   → 이 페이지에서 새 비번 입력 + updateUser
 *   → /dashboard
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionState(user ? "ready" : "missing");
    }).catch(() => setSessionState("missing"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다"); return; }
    if (password !== confirm) { setErr("비밀번호가 일치하지 않습니다"); return; }
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했어요");
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
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✅</div>
              <h2 className="text-base font-bold text-gray-900 mb-1">비밀번호 변경 완료</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                대시보드로 이동합니다…
              </p>
            </div>
          ) : sessionState === "checking" ? (
            <div className="text-center py-4">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
              <p className="mt-3 text-xs text-gray-500">세션 확인 중…</p>
            </div>
          ) : sessionState === "missing" ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">⚠️</div>
              <h2 className="text-base font-bold text-gray-900 mb-1">유효하지 않은 링크</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                재설정 링크가 만료되었거나 유효하지 않아요.<br />
                새로 요청해주세요.
              </p>
              <a href="/forgot-password"
                className="mt-5 inline-block cursor-pointer rounded-xl bg-[#C41E1E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A01818]">
                재설정 다시 요청
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-gray-900 mb-1">새 비밀번호 설정</h2>
              <p className="text-xs text-gray-500 mb-4">앞으로 이 비밀번호로 로그인하실 수 있어요.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    새 비밀번호 <span className="text-gray-400 font-normal text-[10px]">8자 이상</span>
                  </label>
                  <input type="password" required autoComplete="new-password" minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">비밀번호 확인</label>
                  <input type="password" required autoComplete="new-password"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
                </div>
                {err && <p className="text-xs text-red-600">{err}</p>}
                <button type="submit" disabled={loading || !password || !confirm}
                  className="cursor-pointer w-full rounded-xl bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#A01818] disabled:opacity-40">
                  {loading ? "변경 중…" : "비밀번호 변경"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-gray-500">
          <a href="/login" className="hover:underline">← 로그인으로 돌아가기</a>
        </p>
      </div>
    </div>
  );
}
