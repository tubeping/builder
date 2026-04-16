"use client";

import { useState } from "react";

// ─── 타입 ───
type Platform = "instagram" | "youtube" | "tiktok";

interface SocialAccount {
  platform: Platform;
  username: string;
  connected: boolean;
  profileUrl?: string;
}

interface DMRule {
  id: string;
  platform: Platform;
  name: string;
  keywords: string[];
  template: string;
  linkUrl: string;
  productName?: string;
  active: boolean;
  // 통계
  triggered: number;
  dmSent: number;
  clicked: number;
  converted: number;
}

interface DMLog {
  id: string;
  ruleId: string;
  platform: Platform;
  username: string;
  comment: string;
  matchedKeyword: string;
  dmSent: boolean;
  timestamp: string;
}

// ─── 더미 데이터 ───
const DUMMY_ACCOUNTS: SocialAccount[] = [
  { platform: "instagram", username: "@gwibinjeong", connected: true },
  { platform: "youtube", username: "귀빈정", connected: true },
  { platform: "tiktok", username: "@gwibinjeong", connected: false },
];

const DUMMY_RULES: DMRule[] = [
  {
    id: "rule1", platform: "instagram", name: "비타민C 공구 링크",
    keywords: ["링크", "구매", "가격", "비타민", "어디서"],
    template: "안녕하세요! 🎁\n비타민C 공구 링크 보내드려요.\n\n👉 {link}\n\n공구 기간 내 주문 시 무료배송!",
    linkUrl: "tubeping.shop/gwibinjeong?utm_source=instagram&utm_medium=autodm&utm_content=vitaminc",
    productName: "프리미엄 비타민C 5000mg",
    active: true,
    triggered: 234, dmSent: 218, clicked: 127, converted: 23,
  },
  {
    id: "rule2", platform: "instagram", name: "유산균 링크",
    keywords: ["유산균", "장건강", "링크", "구매"],
    template: "안녕하세요! 💊\n유산균 공구 링크입니다.\n\n👉 {link}\n\n지금 주문하면 10% 추가 할인!",
    linkUrl: "tubeping.shop/gwibinjeong?utm_source=instagram&utm_medium=autodm&utm_content=probiotics",
    productName: "프로바이오틱스 유산균",
    active: true,
    triggered: 89, dmSent: 82, clicked: 45, converted: 8,
  },
  {
    id: "rule3", platform: "youtube", name: "에어프라이어 답글",
    keywords: ["링크", "어디서", "구매", "가격"],
    template: "링크 남겨드릴게요! 👉 tubeping.shop/gwibinjeong 에서 확인하세요 😊",
    linkUrl: "tubeping.shop/gwibinjeong?utm_source=youtube&utm_medium=comment_reply",
    productName: "에어프라이어 5.5L",
    active: true,
    triggered: 67, dmSent: 67, clicked: 34, converted: 5,
  },
  {
    id: "rule4", platform: "instagram", name: "전체 공구 안내",
    keywords: ["공구", "할인", "세일"],
    template: "안녕하세요! 현재 진행 중인 공구는 프로필 링크에서 확인하실 수 있어요!\n\n👉 {link}",
    linkUrl: "tubeping.shop/gwibinjeong?utm_source=instagram&utm_medium=autodm",
    active: false,
    triggered: 0, dmSent: 0, clicked: 0, converted: 0,
  },
];

const DUMMY_LOGS: DMLog[] = [
  { id: "l1", ruleId: "rule1", platform: "instagram", username: "@health_lover23", comment: "비타민 링크 주세요!", matchedKeyword: "링크", dmSent: true, timestamp: "2026-04-13 14:23" },
  { id: "l2", ruleId: "rule1", platform: "instagram", username: "@momof2_seoul", comment: "가격이 어떻게 되나요?", matchedKeyword: "가격", dmSent: true, timestamp: "2026-04-13 14:20" },
  { id: "l3", ruleId: "rule2", platform: "instagram", username: "@wellbeing_ji", comment: "유산균 어디서 구매하나요", matchedKeyword: "유산균", dmSent: true, timestamp: "2026-04-13 13:55" },
  { id: "l4", ruleId: "rule3", platform: "youtube", username: "홍길동", comment: "링크 좀 알려주세요~", matchedKeyword: "링크", dmSent: true, timestamp: "2026-04-13 13:40" },
  { id: "l5", ruleId: "rule1", platform: "instagram", username: "@fitgirl_kr", comment: "비타민C 어디서 사요?", matchedKeyword: "어디서", dmSent: true, timestamp: "2026-04-13 12:15" },
  { id: "l6", ruleId: "rule1", platform: "instagram", username: "@sunny_day99", comment: "가격 알려주세요!!", matchedKeyword: "가격", dmSent: true, timestamp: "2026-04-13 11:30" },
];

// ─── 유틸 ───
function platformIcon(p: Platform) {
  switch (p) { case "instagram": return "◎"; case "youtube": return "▶"; case "tiktok": return "♪"; }
}
function platformLabel(p: Platform) {
  switch (p) { case "instagram": return "Instagram"; case "youtube": return "YouTube"; case "tiktok": return "TikTok"; }
}
function platformColor(p: Platform) {
  switch (p) { case "instagram": return "bg-purple-100 text-purple-600"; case "youtube": return "bg-red-100 text-red-600"; case "tiktok": return "bg-gray-900 text-white"; }
}
function deliveryLabel(p: Platform) {
  return p === "instagram" ? "DM 발송" : "댓글 답글";
}

// ─── 메인 컴포넌트 ───
export default function AutoDM() {
  const [rules, setRules] = useState(DUMMY_RULES);
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showNewRule, setShowNewRule] = useState(false);

  // 새 규칙 입력
  const [newPlatform, setNewPlatform] = useState<Platform>("instagram");
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newProduct, setNewProduct] = useState("");

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const totalSent = rules.reduce((s, r) => s + r.dmSent, 0);
  const totalConverted = rules.reduce((s, r) => s + r.converted, 0);
  const totalClicked = rules.reduce((s, r) => s + r.clicked, 0);

  const handleAddRule = () => {
    if (!newName || !newKeywords || !newTemplate) return;
    const rule: DMRule = {
      id: `rule${Date.now()}`, platform: newPlatform, name: newName,
      keywords: newKeywords.split(",").map(s => s.trim()).filter(Boolean),
      template: newTemplate, linkUrl: newLink, productName: newProduct || undefined,
      active: true, triggered: 0, dmSent: 0, clicked: 0, converted: 0,
    };
    setRules(prev => [...prev, rule]);
    setShowNewRule(false);
    setNewName(""); setNewKeywords(""); setNewTemplate(""); setNewLink(""); setNewProduct("");
  };

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">자동응답</h2>
        <p className="mt-1 text-sm text-gray-500">
          댓글 키워드 감지 → 자동 DM/답글로 구매 링크를 발송합니다
        </p>
      </div>

      {/* ── 연동 상태 ── */}
      <div className="mb-5 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3">소셜 계정 연동</p>
        <div className="flex flex-wrap gap-3">
          {DUMMY_ACCOUNTS.map(acc => (
            <div key={acc.platform} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
              acc.connected ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
            }`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${platformColor(acc.platform)}`}>
                {platformIcon(acc.platform)}
              </span>
              <div>
                <p className="text-xs font-medium text-gray-900">{acc.username}</p>
                <p className={`text-[10px] ${acc.connected ? "text-green-600" : "text-gray-400"}`}>
                  {acc.connected ? "연결됨" : "미연결"}
                </p>
              </div>
              {!acc.connected && (
                <button className="ml-2 cursor-pointer rounded bg-[#C41E1E] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#A01818]">
                  연결
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-gray-400">
          Instagram: 댓글 → DM 자동 발송 (24시간 내) · YouTube: 댓글 → 자동 답글 · TikTok: 연동 준비 중
        </p>
      </div>

      {/* ── 요약 통계 ── */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">활성 규칙</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{rules.filter(r => r.active).length}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">발송 수</p>
          <p className="mt-1 text-2xl font-bold text-[#C41E1E]">{totalSent}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">링크 클릭</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalClicked}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">구매 전환</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{totalConverted}건</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            전환율 {totalClicked > 0 ? ((totalConverted / totalClicked) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="mb-4 flex gap-2 border-b border-gray-100 pb-3">
        <button
          onClick={() => setActiveTab("rules")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "rules" ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          규칙 관리
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "logs" ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          최근 활동
        </button>
        <button
          onClick={() => setShowNewRule(true)}
          className="ml-auto cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
        >
          + 새 규칙
        </button>
      </div>

      {/* ── 규칙 관리 탭 ── */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          {rules.map(rule => {
            const isExpanded = expandedRule === rule.id;
            const convRate = rule.clicked > 0 ? ((rule.converted / rule.clicked) * 100).toFixed(1) : "0";
            return (
              <div key={rule.id} className={`rounded-xl border p-4 transition-colors ${
                rule.active ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-60"
              }`}>
                <div className="flex items-start gap-3">
                  {/* 플랫폼 */}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${platformColor(rule.platform)}`}>
                    {platformIcon(rule.platform)}
                  </span>

                  {/* 본문 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">{rule.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        rule.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        {rule.active ? "활성" : "비활성"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {deliveryLabel(rule.platform)}
                      </span>
                    </div>

                    {/* 키워드 */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {rule.keywords.map(kw => (
                        <span key={kw} className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* 통계 */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>감지 <span className="font-medium text-gray-900">{rule.triggered}</span></span>
                      <span>발송 <span className="font-medium text-gray-900">{rule.dmSent}</span></span>
                      <span>클릭 <span className="font-medium text-gray-900">{rule.clicked}</span></span>
                      <span>전환 <span className="font-medium text-[#C41E1E]">{rule.converted}건 ({convRate}%)</span></span>
                    </div>

                    {/* 상세 (펼침) */}
                    {isExpanded && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">응답 템플릿</p>
                          <div className="rounded bg-white border border-gray-200 p-2 text-xs text-gray-700 whitespace-pre-wrap">
                            {rule.template}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">발송 링크</span>
                          <span className="font-medium text-blue-600 truncate max-w-[250px]">{rule.linkUrl}</span>
                        </div>
                        {rule.productName && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">연결 상품</span>
                            <span className="font-medium text-gray-900">{rule.productName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 액션 */}
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        rule.active
                          ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                    >
                      {rule.active ? "끄기" : "켜기"}
                    </button>
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                      className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      {isExpanded ? "접기" : "상세"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 최근 활동 탭 ── */}
      {activeTab === "logs" && (
        <div className="space-y-2">
          {DUMMY_LOGS.map(log => {
            const rule = rules.find(r => r.id === log.ruleId);
            return (
              <div key={log.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${platformColor(log.platform)}`}>
                  {platformIcon(log.platform)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">{log.username}</span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">
                      &ldquo;{log.matchedKeyword}&rdquo;
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 truncate">{log.comment}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[10px] font-medium ${log.dmSent ? "text-green-600" : "text-red-500"}`}>
                    {log.dmSent ? (log.platform === "instagram" ? "DM 발송" : "답글 완료") : "실패"}
                  </p>
                  <p className="text-[10px] text-gray-400">{log.timestamp.split(" ")[1]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 새 규칙 모달 ── */}
      {showNewRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">새 자동응답 규칙</h3>
              <button onClick={() => setShowNewRule(false)} className="cursor-pointer text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              {/* 플랫폼 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">플랫폼</label>
                <div className="flex gap-2">
                  {(["instagram", "youtube"] as Platform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewPlatform(p)}
                      className={`cursor-pointer flex-1 rounded-lg border-2 py-2.5 text-center text-xs font-medium transition-colors ${
                        newPlatform === p ? "border-[#C41E1E] bg-[#fffbfb] text-[#C41E1E]" : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {platformIcon(p)} {platformLabel(p)}
                      <span className="block text-[10px] mt-0.5 opacity-60">
                        {p === "instagram" ? "DM 발송" : "댓글 답글"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 규칙 이름 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">규칙 이름</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="예: 비타민C 공구 링크"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>

              {/* 트리거 키워드 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">트리거 키워드 (쉼표 구분)</label>
                <input
                  type="text" value={newKeywords} onChange={e => setNewKeywords(e.target.value)}
                  placeholder="링크, 구매, 가격, 어디서"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
                <p className="mt-1 text-[10px] text-gray-400">댓글에 이 키워드가 포함되면 자동으로 응답합니다</p>
              </div>

              {/* 응답 템플릿 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  응답 메시지 <span className="text-gray-400 font-normal">({"{link}"}을 넣으면 자동 치환)</span>
                </label>
                <textarea
                  value={newTemplate} onChange={e => setNewTemplate(e.target.value)}
                  rows={4}
                  placeholder={"안녕하세요! 🎁\n공구 링크 보내드려요.\n\n👉 {link}"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E] resize-none"
                />
              </div>

              {/* 링크 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">발송 링크 (UTM 포함 권장)</label>
                <input
                  type="text" value={newLink} onChange={e => setNewLink(e.target.value)}
                  placeholder="tubeping.shop/gwibinjeong?utm_source=instagram&utm_medium=autodm"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>

              {/* 연결 상품 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">연결 상품 (선택)</label>
                <input
                  type="text" value={newProduct} onChange={e => setNewProduct(e.target.value)}
                  placeholder="예: 프리미엄 비타민C 5000mg"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNewRule(false)}
                  className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!newName || !newKeywords || !newTemplate}
                  className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818] disabled:cursor-default disabled:bg-gray-300"
                >
                  규칙 추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
