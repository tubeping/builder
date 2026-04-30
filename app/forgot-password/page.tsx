"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings/account`,
      });
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setSent(true); setLoading(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "요청 실패");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#E63946]">Tube</span>
              <span className="text-gray-900">Ping</span>
            </span>
          </a>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✉️</div>
              <h2 className="text-base font-bold text-gray-900 mb-1">메일을 발송했어요</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                <b>{email}</b>로 비밀번호 재설정 링크를 보냈습니다.<br />
                메일이 보이지 않으면 스팸함도 확인해주세요.
              </p>
              <a href="/login" className="cursor-pointer mt-5 inline-block text-xs text-[#E63946] hover:underline">
                로그인 페이지로 돌아가기
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-gray-900 mb-1">비밀번호 재설정</h2>
              <p className="text-xs text-gray-500 mb-4">가입 시 사용한 이메일을 입력하면 재설정 링크를 보내드려요.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#E63946]" />
                {err && <p className="text-xs text-red-600">{err}</p>}
                <button type="submit" disabled={loading || !email.trim()}
                  className="cursor-pointer w-full rounded-xl bg-[#E63946] py-2.5 text-sm font-bold text-white hover:bg-[#c92e3a] disabled:opacity-40">
                  {loading ? "발송 중…" : "재설정 링크 보내기"}
                </button>
              </form>
              <p className="mt-4 text-center text-[11px] text-gray-500">
                <a href="/login" className="hover:underline">← 로그인으로 돌아가기</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
