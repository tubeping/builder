"use client";

/**
 * 회원가입 — 약관 동의 → 인증 방법 선택(Google or 이메일) → 가입 완료
 *
 * 약관 동의는 가입 성공 후 creators 테이블 또는 별도 audit 테이블에 기록.
 * 현재는 클라이언트 state로만 관리하고 가입 시 metadata에 포함.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface AgreeState {
  age14: boolean;
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [agree, setAgree] = useState<AgreeState>({ age14: false, terms: false, privacy: false, marketing: false });

  const allRequired = agree.age14 && agree.terms && agree.privacy;
  const allChecked = allRequired && agree.marketing;

  const toggleAll = () => {
    const next = !allChecked;
    setAgree({ age14: next, terms: next, privacy: next, marketing: next });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] px-4 py-10">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-6">
          <a href="/" className="inline-block">
            <span className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#C41E1E]">Tube</span>
              <span className="text-gray-900">Ping</span>
            </span>
          </a>
          <p className="mt-2 text-sm text-gray-500">크리에이터 회원가입</p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className={`h-1.5 w-12 rounded-full ${step >= 1 ? "bg-[#C41E1E]" : "bg-gray-200"}`} />
          <span className={`h-1.5 w-12 rounded-full ${step >= 2 ? "bg-[#C41E1E]" : "bg-gray-200"}`} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {step === 1 ? (
            <Step1Agree
              agree={agree}
              setAgree={setAgree}
              allChecked={allChecked}
              allRequired={allRequired}
              toggleAll={toggleAll}
              onNext={() => setStep(2)}
            />
          ) : (
            <Step2Auth marketing={agree.marketing} router={router} />
          )}
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          이미 계정이 있으신가요?{" "}
          <a href="/login" className="font-bold text-[#C41E1E] hover:underline">로그인</a>
        </p>
      </div>
    </div>
  );
}

function Step1Agree({
  agree, setAgree, allChecked, allRequired, toggleAll, onNext,
}: {
  agree: AgreeState;
  setAgree: React.Dispatch<React.SetStateAction<AgreeState>>;
  allChecked: boolean; allRequired: boolean;
  toggleAll: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-1">약관 동의</h2>
      <p className="text-xs text-gray-500 mb-4">서비스 이용을 위해 아래 약관에 동의해주세요.</p>

      {/* 전체 동의 */}
      <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100">
        <input type="checkbox" checked={allChecked} onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 accent-[#C41E1E] cursor-pointer" />
        <span className="text-sm font-bold text-gray-900">전체 동의</span>
        <span className="ml-auto text-[10px] text-gray-400">선택 항목 포함</span>
      </label>

      <div className="my-3 border-t border-gray-100" />

      {/* 개별 항목 */}
      <div className="space-y-2.5">
        <AgreeRow
          checked={agree.age14}
          onChange={(v) => setAgree(s => ({ ...s, age14: v }))}
          required label="만 14세 이상입니다" />
        <AgreeRow
          checked={agree.terms}
          onChange={(v) => setAgree(s => ({ ...s, terms: v }))}
          required label="이용약관 동의"
          link={{ href: "/terms", text: "전문 보기" }} />
        <AgreeRow
          checked={agree.privacy}
          onChange={(v) => setAgree(s => ({ ...s, privacy: v }))}
          required label="개인정보 수집·이용 동의"
          link={{ href: "/privacy", text: "전문 보기" }} />
        <AgreeRow
          checked={agree.marketing}
          onChange={(v) => setAgree(s => ({ ...s, marketing: v }))}
          label="마케팅 정보 수신 동의 (이메일·SMS)" />
      </div>

      {!allRequired && (
        <p className="mt-3 text-[11px] text-amber-600">
          ⚠ 필수 항목 3개에 모두 동의해야 가입할 수 있습니다.
        </p>
      )}

      <button
        onClick={onNext}
        disabled={!allRequired}
        className="cursor-pointer mt-5 w-full rounded-xl bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#c92e3a] disabled:opacity-40 disabled:cursor-default"
      >
        다음
      </button>
    </div>
  );
}

function AgreeRow({ checked, onChange, label, required, link }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
  required?: boolean; link?: { href: string; text: string };
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-[#C41E1E] cursor-pointer" />
      <span className="text-xs text-gray-700">
        <span className={required ? "font-bold text-gray-900" : "text-gray-500"}>
          {required ? "(필수)" : "(선택)"}
        </span>{" "}
        {label}
      </span>
      {link && (
        <a href={link.href} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[10px] text-gray-400 hover:text-[#C41E1E] hover:underline shrink-0">
          {link.text}
        </a>
      )}
    </label>
  );
}

function Step2Auth({ marketing, router }: { marketing: boolean; router: ReturnType<typeof useRouter> }) {
  const [mode, setMode] = useState<"choice" | "email">("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const handleGoogle = async () => {
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          queryParams: {
            // 약관 동의 사실을 metadata로 전달 (callback에서 creators 테이블 기록)
            tubeping_marketing_opt_in: marketing ? "1" : "0",
          },
        },
      });
      if (error) { setErr(error.message); setLoading(false); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "가입 실패");
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setErr("비밀번호가 일치하지 않습니다"); return; }
    if (password.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다"); return; }
    if (!name.trim()) { setErr("이름을 입력해주세요"); return; }
    setErr(""); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          data: {
            name: name.trim(),
            marketing_opt_in: marketing,
            terms_agreed_at: new Date().toISOString(),
          },
        },
      });
      if (error) {
        setErr(translateSignupError(error.message));
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "가입 실패");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✉️</div>
        <h2 className="text-base font-bold text-gray-900 mb-1">인증 메일 발송 완료</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          <b className="text-gray-700">{email}</b>로 인증 링크를 보냈어요.<br />
          메일을 확인하고 링크를 클릭하면 가입이 완료됩니다.
        </p>
        <button onClick={() => router.push("/login")}
          className="cursor-pointer mt-5 w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
          로그인 페이지로
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-1">가입 방법 선택</h2>
      <p className="text-xs text-gray-500 mb-4">간편 가입은 Google을 추천해요.</p>

      {mode === "choice" ? (
        <>
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="cursor-pointer flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <GoogleIcon />
            Google로 가입하기
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] text-gray-400 uppercase">또는</span></div>
          </div>

          <button
            onClick={() => setMode("email")}
            className="cursor-pointer w-full rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
          >
            이메일로 가입
          </button>
        </>
      ) : (
        <form onSubmit={handleEmail} className="space-y-3">
          <button type="button" onClick={() => setMode("choice")}
            className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600">
            ← 가입 방법 다시 선택
          </button>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">이름</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">이메일</label>
            <input type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">비밀번호 <span className="text-gray-400 font-normal text-[10px]">8자 이상</span></label>
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
          <button type="submit" disabled={loading || !email || !password || !confirm || !name}
            className="cursor-pointer w-full rounded-xl bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#c92e3a] disabled:opacity-40">
            {loading ? "가입 중…" : "가입하기"}
          </button>
        </form>
      )}
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

function translateSignupError(msg: string): string {
  if (/User already registered/i.test(msg)) return "이미 가입된 이메일입니다. 로그인해주세요.";
  if (/Password should be/i.test(msg)) return "비밀번호 형식이 올바르지 않습니다 (8자 이상)";
  if (/rate limit/i.test(msg)) return "잠시 후 다시 시도해주세요";
  if (/email/i.test(msg) && /invalid/i.test(msg)) return "유효한 이메일이 아닙니다";
  return msg;
}
