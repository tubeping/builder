"use client";

import { useState } from "react";

// ─── 메인 컴포넌트 ───
export default function Settings() {
  const [activeSection, setActiveSection] = useState<"account" | "notify" | "bank" | "biz" | "affiliate">("account");

  const SECTIONS = [
    { key: "account" as const, label: "계정", icon: "👤" },
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
function AccountSection() {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900">계정 정보</h3>
      <div className="space-y-3">
        <Field label="이름" value="김수현" />
        <Field label="이메일" value="sh.kim@example.com" />
        <Field label="전화번호" value="010-1234-5678" />
        <Field label="쇼핑몰 slug" value="gwibinjeong" suffix=".tubeping.shop" />
      </div>
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

