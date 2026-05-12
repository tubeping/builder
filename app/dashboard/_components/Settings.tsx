"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// ─── 메인 컴포넌트 ───
export default function Settings() {
  const [activeSection, setActiveSection] = useState<"account" | "security" | "notify" | "bank" | "biz" | "affiliate">("account");

  const SECTIONS = [
    { key: "account" as const, label: "계정", icon: "👤" },
    { key: "security" as const, label: "보안 / 로그인 이력", icon: "🔒" },
    { key: "notify" as const, label: "알림", icon: "🔔" },
    { key: "bank" as const, label: "은행 계좌", icon: "🏦" },
    { key: "biz" as const, label: "사업자 정보", icon: "📋" },
    { key: "affiliate" as const, label: "어필리에이트 연동", icon: "🔗" },
  ];

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">설정</h2>
        <p className="mt-1 text-sm text-gray-500">계정, 알림, 정산 정보를 관리하세요</p>
      </div>

      <div className="flex gap-5">
        {/* 섹션 탭 */}
        <nav className="w-[200px] shrink-0">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeSection === s.key
                  ? "bg-[#fff0f0] text-[#C41E1E] font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* 콘텐츠 */}
        <div className="flex-1">
          {activeSection === "account" && <AccountSection />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "notify" && <NotifySection />}
          {activeSection === "bank" && <BankSection />}
          {activeSection === "biz" && <BizSection />}
          {activeSection === "affiliate" && <AffiliateSection />}
        </div>
      </div>
    </div>
  );
}

// ─── 계정 섹션 ───
interface AccountUser {
  email: string;
  name?: string;
  shop_slug?: string;
  channel_url?: string;
  role?: string;
  created_at?: string;
  provider?: string;
}

function AccountSection() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    Promise.all([
      fetch("/api/me").then(r => r.ok ? r.json() : null).catch(() => null),
      supabase.auth.getUser(),
    ]).then(([me, { data }]) => {
      if (me) {
        setAccount({
          email: me.email || data.user?.email || "",
          name: me.name,
          shop_slug: me.shop_slug,
          channel_url: me.channel_url,
          role: me.role,
          created_at: data.user?.created_at,
          provider: data.user?.app_metadata?.provider || "email",
        });
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">로딩 중…</div>;
  }

  if (!account) {
    return <div className="rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-400">계정 정보를 불러올 수 없습니다</div>;
  }

  const providerLabel: Record<string, string> = {
    google: "Google 계정",
    email: "이메일/비밀번호",
  };

  const joinDate = account.created_at ? new Date(account.created_at).toLocaleDateString("ko-KR") : "—";

  return (
    <div className="space-y-4">
      {/* 계정 정보 */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">계정 정보</h3>
        <div className="space-y-3">
          <Field label="이메일" value={account.email} />
          <Field label="이름" value={account.name || "—"} />
          <Field label="쇼핑몰 슬러그" value={account.shop_slug || "—"} suffix=" (URL: /shop/{slug})" />
          <Field label="채널 URL" value={account.channel_url || "—"} />
          <Field label="가입 방식" value={providerLabel[account.provider || "email"] || account.provider || "—"} />
          <Field label="가입일" value={joinDate} />
          {account.role && account.role !== "creator" && (
            <Field label="권한" value={account.role === "super_admin" ? "최고 관리자" : "관리자"} />
          )}
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <PasswordChangeCard provider={account.provider || "email"} />

      {/* 회원 탈퇴 */}
      <DeleteAccountCard onDeleted={() => router.push("/login")} />
    </div>
  );
}

function PasswordChangeCard({ provider }: { provider: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (next.length < 8) { setMsg({ type: "error", text: "비밀번호는 8자 이상이어야 합니다" }); return; }
    if (next !== confirm) { setMsg({ type: "error", text: "비밀번호가 일치하지 않습니다" }); return; }

    setMsg(null); setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({ type: "success", text: "비밀번호가 변경되었습니다" });
        setCurrent(""); setNext(""); setConfirm("");
        setTimeout(() => { setMsg(null); setOpen(false); }, 2000);
      }
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "오류" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">비밀번호</h3>
          <p className="mt-1 text-xs text-gray-500">
            {provider === "google"
              ? "Google 계정으로 가입하셨어요. 별도 비밀번호를 설정하면 이메일 로그인도 가능합니다."
              : "보안을 위해 주기적으로 변경하는 것을 권장합니다."}
          </p>
        </div>
        {!open && (
          <button onClick={() => { setOpen(true); setMsg(null); }}
            className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {provider === "google" ? "비밀번호 설정" : "변경"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">새 비밀번호 <span className="text-gray-400 font-normal">8자 이상</span></label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">새 비밀번호 확인</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          {msg && (
            <p className={`text-xs ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setOpen(false); setMsg(null); setNext(""); setConfirm(""); }}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button onClick={handleSubmit} disabled={loading || !next || !confirm}
              className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-bold text-white hover:bg-[#A01818] disabled:opacity-40">
              {loading ? "변경 중…" : "비밀번호 변경"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteAccountCard({ onDeleted }: { onDeleted: () => void }) {
  const [step, setStep] = useState<"idle" | "confirm" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "탈퇴합니다") {
      setErrorMsg("'탈퇴합니다'를 정확히 입력해주세요");
      return;
    }
    setStep("loading"); setErrorMsg("");
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.error || "탈퇴 처리 실패");
        setStep("error");
        return;
      }
      onDeleted();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "네트워크 오류");
      setStep("error");
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
      <h3 className="text-base font-semibold text-red-700">회원 탈퇴</h3>
      <p className="mt-1 text-xs text-red-600/80 leading-relaxed">
        탈퇴 시 본인의 PICK, 캠페인, 통계 등 <b>모든 데이터가 영구 삭제</b>됩니다.
        외부 플랫폼 연동도 즉시 해제되며, 복구는 불가합니다.
        법령상 보관 의무가 있는 데이터(결제·청약 기록)는 5년 동안 안전하게 분리 보관됩니다.
      </p>

      {step === "idle" && (
        <button onClick={() => setStep("confirm")}
          className="mt-4 cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          회원 탈퇴
        </button>
      )}

      {(step === "confirm" || step === "error") && (
        <div className="mt-4 space-y-3 rounded-lg border border-red-200 bg-white p-4">
          <p className="text-xs text-gray-700">
            계속하시려면 아래에 <b className="text-red-600">탈퇴합니다</b>를 정확히 입력해주세요.
          </p>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
            placeholder="탈퇴합니다"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500" />
          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setStep("idle"); setConfirmText(""); setErrorMsg(""); }}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button onClick={handleDelete} disabled={confirmText !== "탈퇴합니다"}
              className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-default">
              탈퇴 처리
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="mt-4 flex items-center justify-center py-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
          <span className="ml-2 text-sm text-red-600">탈퇴 처리 중…</span>
        </div>
      )}
    </div>
  );
}

// ─── 알림 섹션 ───
function NotifySection() {
  const [kakao, setKakao] = useState(true);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900">알림 설정</h3>
      <div className="space-y-3">
        <Toggle label="카카오톡 알림" desc="공구 제안, 정산 알림" value={kakao} onChange={setKakao} />
        <Toggle label="이메일 알림" desc="주간 리포트, 세금계산서" value={email} onChange={setEmail} />
        <Toggle label="SMS 알림" desc="긴급 알림만" value={sms} onChange={setSms} />
      </div>
    </div>
  );
}

// ─── 은행 섹션 ───
function BankSection() {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900">정산 계좌</h3>
      <p className="mb-4 text-xs text-gray-500">정산은 매월 5일에 입금됩니다</p>
      <div className="space-y-3">
        <Field label="은행" value="국민은행" />
        <Field label="계좌번호" value="123-4567-8901" />
        <Field label="예금주" value="김수현" />
      </div>
      <button className="mt-4 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
        계좌 변경
      </button>
    </div>
  );
}

// ─── 사업자 섹션 ───
function BizSection() {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900">사업자 정보</h3>
      <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">
        사업자 등록 후 세금계산서 자동 발행이 가능합니다
      </div>
      <div className="space-y-3">
        <Field label="사업자 유형" value="간이과세자" />
        <Field label="사업자 등록번호" value="미등록" muted />
        <Field label="상호" value="-" muted />
      </div>
      <button className="mt-4 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]">
        사업자 등록
      </button>
    </div>
  );
}

// ─── 어필리에이트 섹션 ───
function AffiliateSection() {
  const [coupangAccess, setCoupangAccess] = useState(
    typeof window !== "undefined" ? localStorage.getItem("coupang_access_key") || "" : ""
  );
  const [coupangSecret, setCoupangSecret] = useState(
    typeof window !== "undefined" ? localStorage.getItem("coupang_secret_key") || "" : ""
  );
  const [coupangEditing, setCoupangEditing] = useState(false);
  const [coupangSaved, setCoupangSaved] = useState(false);

  const [naverId, setNaverId] = useState(
    typeof window !== "undefined" ? localStorage.getItem("naver_partner_id") || "" : ""
  );
  const [naverEditing, setNaverEditing] = useState(false);
  const [naverSaved, setNaverSaved] = useState(false);

  const isCoupangConnected = !!coupangAccess && !!coupangSecret;
  const isNaverConnected = !!naverId;

  const saveCoupang = () => {
    localStorage.setItem("coupang_access_key", coupangAccess);
    localStorage.setItem("coupang_secret_key", coupangSecret);
    setCoupangEditing(false);
    setCoupangSaved(true);
    setTimeout(() => setCoupangSaved(false), 2000);
  };

  const resetCoupang = () => {
    localStorage.removeItem("coupang_access_key");
    localStorage.removeItem("coupang_secret_key");
    setCoupangAccess("");
    setCoupangSecret("");
    setCoupangEditing(false);
  };

  const saveNaver = () => {
    localStorage.setItem("naver_partner_id", naverId);
    setNaverEditing(false);
    setNaverSaved(true);
    setTimeout(() => setNaverSaved(false), 2000);
  };

  const resetNaver = () => {
    localStorage.removeItem("naver_partner_id");
    setNaverId("");
    setNaverEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* 쿠팡 파트너스 */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">쿠팡 파트너스</h3>
          {isCoupangConnected && !coupangEditing && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연결됨</span>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-500">
          쿠팡 파트너스 가입 후 API 키를 입력하면 상품 검색 + 어필리에이트 링크가 자동 생성됩니다.
          수수료는 본인 쿠팡 파트너스 계정으로 직접 입금됩니다.
        </p>
        {coupangEditing || !isCoupangConnected ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Access Key"
              value={coupangAccess}
              onChange={(e) => setCoupangAccess(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
            />
            <input
              type="password"
              placeholder="Secret Key"
              value={coupangSecret}
              onChange={(e) => setCoupangSecret(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
            />
            <div className="flex gap-2">
              <button
                onClick={saveCoupang}
                disabled={!coupangAccess.trim() || !coupangSecret.trim()}
                className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-50"
              >
                저장
              </button>
              {isCoupangConnected && (
                <button
                  onClick={() => setCoupangEditing(false)}
                  className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setCoupangEditing(true)}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              키 변경
            </button>
            <button
              onClick={resetCoupang}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-500"
            >
              연결 해제
            </button>
          </div>
        )}
        {coupangSaved && <p className="mt-2 text-xs text-green-600">저장되었습니다!</p>}
      </div>

      {/* 네이버 파트너스 */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">네이버 파트너스</h3>
          {isNaverConnected && !naverEditing && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">연결됨</span>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-500">
          네이버 파트너스 ID를 입력하면 네이버 상품 링크에 자동으로 추적 코드가 추가됩니다.
          수수료는 본인 네이버 파트너스 계정으로 직접 입금됩니다.
        </p>
        {naverEditing || !isNaverConnected ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="네이버 파트너스 ID"
              value={naverId}
              onChange={(e) => setNaverId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNaver}
                disabled={!naverId.trim()}
                className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-50"
              >
                저장
              </button>
              {isNaverConnected && (
                <button
                  onClick={() => setNaverEditing(false)}
                  className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setNaverEditing(true)}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ID 변경
            </button>
            <button
              onClick={resetNaver}
              className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-500"
            >
              연결 해제
            </button>
          </div>
        )}
        {naverSaved && <p className="mt-2 text-xs text-green-600">저장되었습니다!</p>}
      </div>
    </div>
  );
}

// ─── 하위 컴포넌트 ───
function Field({ label, value, suffix, muted }: { label: string; value: string; suffix?: string; muted?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-sm ${muted ? "text-gray-400" : "text-gray-900"}`}>
        {value}
        {suffix && <span className="text-gray-400">{suffix}</span>}
      </p>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-100 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
          value ? "bg-[#C41E1E]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            value ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ─── 보안 / 로그인 이력 섹션 ───
interface LoginLog {
  id: string;
  event_type: string;
  method: string | null;
  device: string | null;
  ip_hash: string | null;
  error_message: string | null;
  created_at: string;
}

const EVENT_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  login_success: { label: "로그인 성공", bg: "bg-green-50", color: "text-green-700", icon: "✅" },
  login_failed: { label: "로그인 실패", bg: "bg-red-50", color: "text-red-700", icon: "⚠️" },
  logout: { label: "로그아웃", bg: "bg-gray-50", color: "text-gray-600", icon: "🚪" },
  password_reset: { label: "비번 재설정", bg: "bg-blue-50", color: "text-blue-700", icon: "🔑" },
  signup: { label: "가입", bg: "bg-purple-50", color: "text-purple-700", icon: "✨" },
};

function SecuritySection() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/login-history")
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900">로그인 활동 이력</h3>
        <p className="mt-1 text-xs text-gray-500">
          본인 계정의 최근 50건 로그인·로그아웃 기록입니다. 본인 활동이 아닌 게 있으면 즉시 비밀번호를 변경하세요.
        </p>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
          </div>
        ) : logs.length === 0 ? (
          <p className="mt-4 py-6 text-center text-xs text-gray-400">아직 기록이 없어요</p>
        ) : (
          <div className="mt-4 space-y-1.5 max-h-[400px] overflow-y-auto">
            {logs.map((l) => {
              const meta = EVENT_META[l.event_type] || { label: l.event_type, bg: "bg-gray-50", color: "text-gray-600", icon: "•" };
              const dt = new Date(l.created_at).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full ${meta.bg} ${meta.color} px-2 py-0.5 text-[10px] font-bold`}>
                    <span>{meta.icon}</span>{meta.label}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px] text-gray-500">
                    {l.method && <span>{l.method === "google" ? "🔵 Google" : l.method === "email" ? "📧 이메일" : l.method}</span>}
                    {l.device && <span>· {l.device === "mobile" ? "📱" : l.device === "tablet" ? "📲" : "💻"} {l.device}</span>}
                    {l.error_message && <span className="text-red-500 truncate">· {l.error_message}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{dt}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TwoFactorSection />
    </div>
  );
}

// ─── 2FA (TOTP) ───
interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
}

function TwoFactorSection() {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [step, setStep] = useState<"loading" | "idle" | "enrolling" | "verifying" | "active">("loading");
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const supabase = createSupabaseBrowser();
    const { data } = await supabase.auth.mfa.listFactors();
    const totps = (data?.totp || []) as TotpFactor[];
    setFactors(totps);
    const verified = totps.find((f) => f.status === "verified");
    setStep(verified ? "active" : "idle");
  };

  useEffect(() => { refresh(); }, []);

  const handleEnroll = async () => {
    setErr(""); setBusy(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "TubePing-" + new Date().toISOString().slice(0, 10),
      });
      if (error) { setErr(error.message); return; }
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("verifying");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) { setErr("6자리 숫자 코드를 입력해주세요"); return; }
    setErr(""); setBusy(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) { setErr(chErr.message); return; }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: challenge.id, code,
      });
      if (vErr) { setErr("코드가 일치하지 않아요. 다시 시도해주세요"); return; }
      await refresh();
      setQrSvg(""); setSecret(""); setFactorId(""); setCode("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "검증 실패");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async (fid: string) => {
    if (!confirm("2단계 인증을 해제하시겠어요? 계정 보안이 약해집니다.")) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowser();
      await supabase.auth.mfa.unenroll({ factorId: fid });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEnroll = async () => {
    if (factorId) {
      const supabase = createSupabaseBrowser();
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setQrSvg(""); setSecret(""); setFactorId(""); setCode(""); setErr("");
    await refresh();
  };

  if (step === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">🔐</span>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">2단계 인증 (TOTP)</h3>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            Google Authenticator·1Password·Authy 등 OTP 앱과 연동하여 로그인 시 6자리 코드를 추가로 요구합니다.
          </p>
        </div>
        {step === "active" && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700">활성</span>
        )}
      </div>

      {/* idle — 활성화 전 */}
      {step === "idle" && (
        <button onClick={handleEnroll} disabled={busy}
          className="cursor-pointer rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? "준비 중…" : "2단계 인증 활성화"}
        </button>
      )}

      {/* verifying — QR 표시 + 코드 입력 */}
      {step === "verifying" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="mb-2 text-xs font-bold text-gray-700">1️⃣ OTP 앱에서 QR 스캔 또는 시크릿 키 입력</p>
            <div className="mx-auto mb-2 inline-block bg-white p-3 rounded-lg border border-gray-200"
              dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="mt-2 text-[10px] text-gray-400">또는 시크릿 키 직접 입력:</p>
            <code className="mt-1 inline-block rounded bg-white px-2 py-1 text-[11px] font-mono text-gray-700 border border-gray-200">{secret}</code>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">2️⃣ 앱에 표시된 6자리 코드 입력</label>
            <input type="text" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" maxLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-lg font-mono tracking-[0.3em] outline-none focus:border-[#C41E1E]" />
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="flex gap-2">
            <button onClick={handleCancelEnroll} disabled={busy}
              className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button onClick={handleVerify} disabled={busy || code.length !== 6}
              className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#A01818] disabled:opacity-40">
              {busy ? "검증 중…" : "활성화"}
            </button>
          </div>
        </div>
      )}

      {/* active — 활성 상태 */}
      {step === "active" && factors.length > 0 && (
        <div className="space-y-2">
          {factors.filter(f => f.status === "verified").map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
              <div className="text-xs">
                <p className="font-bold text-gray-900">{f.friendly_name || "OTP 앱"}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  등록일: {new Date(f.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <button onClick={() => handleDisable(f.id)} disabled={busy}
                className="cursor-pointer rounded-md border border-red-200 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                해제
              </button>
            </div>
          ))}
          <p className="mt-2 text-[10px] text-gray-400">
            ✅ 다음 로그인부터 6자리 코드를 추가로 요구합니다.
          </p>
        </div>
      )}

      {step === "idle" && err && <p className="mt-3 text-xs text-red-600">{err}</p>}
    </div>
  );
}

