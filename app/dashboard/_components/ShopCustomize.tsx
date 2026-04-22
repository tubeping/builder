"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ShopTheme, type ThemePreset, type BlockShape, type BlockShadow, type BlockAlign, type FontKey,
  DEFAULT_THEME, PRESETS, BG_COLORS, FONTS, normalizeTheme, themeToCssVars,
} from "@/lib/shop-theme";

// ─── 타입 ───
interface ShopBlock {
  id: string;
  type: "hero" | "text" | "image" | "banner" | "links" | "picks" | "video" | "divider" | "gallery" | "calendar" | "campaign_live" | "campaign_teaser";
  data: Record<string, unknown>;
}

interface LinkItem { id: string; label: string; url: string; icon: string; }

const BLOCK_TYPES: { type: ShopBlock["type"]; label: string; icon: string; desc: string }[] = [
  { type: "hero", label: "프로필", icon: "👤", desc: "커버·프로필·소개" },
  { type: "text", label: "텍스트", icon: "📝", desc: "자유 텍스트" },
  { type: "image", label: "이미지", icon: "🖼️", desc: "이미지 + 캡션" },
  { type: "campaign_live", label: "공구 라이브", icon: "🔴", desc: "진행률+카운트다운" },
  { type: "campaign_teaser", label: "공구 티저", icon: "🔔", desc: "오픈 전 알림 신청" },
  { type: "banner", label: "배너", icon: "🔥", desc: "공구/이벤트" },
  { type: "calendar", label: "공구 캘린더", icon: "📅", desc: "월별 공구 일정" },
  { type: "links", label: "링크", icon: "🔗", desc: "SNS·외부 링크" },
  { type: "picks", label: "상품", icon: "📦", desc: "내 PICK" },
  { type: "video", label: "영상", icon: "▶️", desc: "유튜브" },
  { type: "divider", label: "구분선", icon: "━", desc: "섹션 구분" },
  { type: "gallery", label: "갤러리", icon: "🎨", desc: "이미지 그리드" },
];

const DEFAULT_BLOCKS: ShopBlock[] = [
  { id: "b1", type: "hero", data: { name: "내 쇼핑몰", bio: "", cover_url: "", profile_url: "" } },
  { id: "b2", type: "links", data: { items: [{ id: "l1", label: "Instagram", url: "", icon: "📷" }, { id: "l2", label: "YouTube", url: "", icon: "▶️" }] } },
  { id: "b3", type: "picks", data: { filter: "all", limit: 12 } },
];

let blockCounter = 100;
function newId() { return "b" + (++blockCounter) + "_" + Date.now(); }

// ─── 드래그 가능 블록 ───
function SortableBlock({ block, isSelected, onSelect, onDelete, compact }: {
  block: ShopBlock; isSelected: boolean; onSelect: () => void; onDelete: () => void; compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.5 : 1 };
  const meta = BLOCK_TYPES.find(t => t.type === block.type);

  if (compact) {
    return (
      <div ref={setNodeRef} style={style} onClick={onSelect} {...attributes} {...listeners}
        title={meta?.label}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all cursor-pointer active:cursor-grabbing ${
          isSelected ? "border-[#C41E1E] bg-[#FFF5F5] shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
        }`}>
        <span className="text-base">{meta?.icon}</span>
        {isSelected && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#C41E1E]" />
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}
      className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${
        isSelected ? "border-[#C41E1E] bg-[#FFF5F5] shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      <span className="text-base shrink-0">{meta?.icon}</span>
      <span className="flex-1 text-sm font-medium text-gray-800">{meta?.label}</span>
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="cursor-pointer opacity-0 group-hover:opacity-100 rounded-md p-1 text-gray-300 hover:text-[#C41E1E] hover:bg-red-50 transition-all">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ─── 편집 패널 ───
function BlockEditor({ block, onChange }: { block: ShopBlock; onChange: (data: Record<string, unknown>) => void }) {
  const d = block.data;
  const meta = BLOCK_TYPES.find(t => t.type === block.type);
  const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E] focus:bg-white focus:ring-1 focus:ring-[#C41E1E]/20 transition-all";
  const lc = "mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wider";

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <span className="text-xl">{meta?.icon}</span>
        <div><h4 className="text-sm font-bold text-gray-900">{meta?.label} 설정</h4><p className="text-[10px] text-gray-400">{meta?.desc}</p></div>
      </div>
      <div className="space-y-4">
        {block.type === "hero" && (<>
          <div><label className={lc}>쇼핑몰 이름</label><input type="text" value={(d.name as string) || ""} onChange={e => onChange({ ...d, name: e.target.value })} className={ic} /></div>
          <div><label className={lc}>소개글</label><textarea value={(d.bio as string) || ""} onChange={e => onChange({ ...d, bio: e.target.value })} rows={3} placeholder="나를 소개하는 글" className={ic + " resize-none"} /></div>
          <div>
            <label className={lc}>커버 이미지 <span className="text-[10px] font-normal text-gray-400">16:9 권장</span></label>
            <ImageUpload value={(d.cover_url as string) || ""} onChange={(url) => onChange({ ...d, cover_url: url })} aspect="16/9" label="커버" />
          </div>
          <div>
            <label className={lc}>프로필 이미지 <span className="text-[10px] font-normal text-gray-400">정사각형 · 원형 크롭</span></label>
            <ImageUpload value={(d.profile_url as string) || ""} onChange={(url) => onChange({ ...d, profile_url: url })} aspect="1/1" rounded label="프로필" />
          </div>
        </>)}
        {block.type === "text" && (<div><label className={lc}>내용</label><textarea value={(d.content as string) || ""} onChange={e => onChange({ ...d, content: e.target.value })} rows={6} placeholder="자유롭게 텍스트를 입력하세요" className={ic + " resize-none"} /></div>)}
        {block.type === "image" && (<>
          <div>
            <label className={lc}>이미지</label>
            <ImageUpload value={(d.url as string) || ""} onChange={(url) => onChange({ ...d, url })} aspect="4/3" label="이미지" />
          </div>
          <div><label className={lc}>캡션</label><input type="text" value={(d.caption as string) || ""} onChange={e => onChange({ ...d, caption: e.target.value })} className={ic} /></div>
        </>)}
        {block.type === "banner" && (<>
          <div><label className={lc}>배너 제목</label><input type="text" value={(d.title as string) || ""} onChange={e => onChange({ ...d, title: e.target.value })} placeholder="이번 주 공구!" className={ic} /></div>
          <div><label className={lc}>부제목</label><input type="text" value={(d.subtitle as string) || ""} onChange={e => onChange({ ...d, subtitle: e.target.value })} className={ic} /></div>
          <div><label className={lc}>D-day</label><input type="number" value={(d.dday as number) ?? ""} onChange={e => onChange({ ...d, dday: parseInt(e.target.value) || 0 })} className={`${ic} w-24`} /></div>
          <div>
            <label className={lc}>배너 이미지</label>
            <ImageUpload value={(d.image_url as string) || ""} onChange={(url) => onChange({ ...d, image_url: url })} aspect="1/1" label="배너" />
          </div>
          <div><label className={lc}>링크 URL</label><input type="url" value={(d.link_url as string) || ""} onChange={e => onChange({ ...d, link_url: e.target.value })} className={ic} /></div>
        </>)}
        {block.type === "links" && (() => {
          const items = (d.items as LinkItem[]) || [];
          return (<>
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">링크 {i + 1}</span>
                  <button onClick={() => onChange({ ...d, items: items.filter(x => x.id !== item.id) })} className="cursor-pointer text-[10px] text-red-400 hover:text-red-600">삭제</button>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={item.icon} onChange={e => { const n = [...items]; n[i] = { ...item, icon: e.target.value }; onChange({ ...d, items: n }); }} className="w-12 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-sm outline-none" />
                  <input type="text" value={item.label} onChange={e => { const n = [...items]; n[i] = { ...item, label: e.target.value }; onChange({ ...d, items: n }); }} placeholder="라벨" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                </div>
                <input type="url" value={item.url} onChange={e => { const n = [...items]; n[i] = { ...item, url: e.target.value }; onChange({ ...d, items: n }); }} placeholder="https://..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
              </div>
            ))}
            <button onClick={() => onChange({ ...d, items: [...items, { id: "l" + Date.now(), label: "", url: "", icon: "🔗" }] })}
              className="cursor-pointer w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-xs font-medium text-gray-400 hover:border-[#C41E1E] hover:text-[#C41E1E] transition-colors">+ 링크 추가</button>
          </>);
        })()}
        {block.type === "video" && (<div><label className={lc}>유튜브 URL</label><input type="url" value={(d.youtube_url as string) || ""} onChange={e => onChange({ ...d, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={ic} /></div>)}
        {block.type === "picks" && (<>
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">내 PICK에 등록된 상품이 자동 표시됩니다</p>
          <div><label className={lc}>표시 개수</label><input type="number" value={(d.limit as number) || 12} onChange={e => onChange({ ...d, limit: parseInt(e.target.value) || 12 })} min={1} max={50} className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
        </>)}
        {block.type === "gallery" && (() => {
          const imgs = (d.images as string[]) || [];
          return (<>
            <div>
              <label className={lc}>갤러리 이미지 <span className="text-[10px] font-normal text-gray-400">· {imgs.length}장</span></label>
              <div className="grid grid-cols-3 gap-2">
                {imgs.map((src, i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button type="button"
                      onClick={() => onChange({ ...d, images: imgs.filter((_, j) => j !== i) })}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[10px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      ✕
                    </button>
                  </div>
                ))}
                <ImageUpload value="" onChange={(url) => { if (url) onChange({ ...d, images: [...imgs, url] }); }} aspect="1/1" label="추가" />
              </div>
            </div>
            <div><label className={lc}>열 수</label><div className="flex gap-2">{[2, 3, 4].map(n => (<button key={n} onClick={() => onChange({ ...d, columns: n })} className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold transition-all ${(d.columns || 2) === n ? "bg-[#C41E1E] text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{n}열</button>))}</div></div>
          </>);
        })()}
        {block.type === "divider" && (<p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">설정 없음</p>)}
        {block.type === "calendar" && (() => {
          interface ManualEvent {
            id: string;
            title: string;
            image: string | null;
            start_date: string; // YYYY-MM-DD
            end_date: string;
            price?: number;
            link_url?: string;
            platform?: string;
            status: "upcoming" | "active" | "ended";
          }
          const raw = (d.manual_events as ManualEvent[]) || [];
          const defaultDays = (d.default_duration_days as number) || 7;

          // status는 날짜 기반 자동 계산 (저장 시 fix)
          const computeStatus = (start: string, end: string): ManualEvent["status"] => {
            const now = Date.now();
            const s = new Date(start).getTime();
            const e = new Date(end).setHours(23, 59, 59, 999);
            if (now >= s && now <= e) return "active";
            if (now > e) return "ended";
            return "upcoming";
          };

          const update = (i: number, patch: Partial<ManualEvent>) => {
            const next = [...raw];
            next[i] = { ...next[i], ...patch };
            // 날짜가 바뀌면 status 재계산
            if ("start_date" in patch || "end_date" in patch) {
              next[i].status = computeStatus(next[i].start_date, next[i].end_date);
            }
            onChange({ ...d, manual_events: next });
          };

          const addEvent = () => {
            const today = new Date();
            const weekLater = new Date(today.getTime() + defaultDays * 86400000);
            const iso = (x: Date) => x.toISOString().slice(0, 10);
            const ne: ManualEvent = {
              id: "e" + Date.now(),
              title: "",
              image: null,
              start_date: iso(today),
              end_date: iso(weekLater),
              status: "upcoming",
            };
            onChange({ ...d, manual_events: [...raw, ne] });
          };

          const remove = (id: string) => onChange({ ...d, manual_events: raw.filter(x => x.id !== id) });

          return (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-[11px] leading-relaxed text-blue-900">
                💡 여기에 등록한 <b>공구 일정</b>은 내 쇼핑몰의 월별 캘린더에 자동 표시됩니다.
                <br />
                튜핑 내부 공구(카페24 연동)는 <b>자동으로</b> 추가돼요. 외부 공구(쿠팡/네이버/자사몰)만 직접 등록하면 됩니다.
              </div>

              <div>
                <label className={lc}>기본 공구 기간 <span className="text-gray-400 text-[10px]">(종료일 미지정 시 오픈일 + N일)</span></label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={60}
                    value={defaultDays}
                    onChange={e => onChange({ ...d, default_duration_days: parseInt(e.target.value) || 7 })}
                    className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
                  <span className="text-xs text-gray-500">일</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">공구 일정 <span className="text-[#C41E1E]">{raw.length}</span></span>
                  {raw.length > 0 && <span className="text-[10px] text-gray-400">드래그 순서는 날짜 기준 자동</span>}
                </div>

                {raw.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">등록된 공구가 없어요</p>
                    <p className="text-[10px] text-gray-300">아래 버튼을 눌러 일정을 추가하세요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {raw.map((ev, i) => {
                      const status = computeStatus(ev.start_date, ev.end_date);
                      const statusColor = status === "active" ? "bg-green-100 text-green-700" :
                                          status === "ended" ? "bg-gray-100 text-gray-400" :
                                          "bg-blue-50 text-blue-600";
                      const statusLabel = status === "active" ? "진행중" : status === "ended" ? "종료" : "예정";
                      return (
                        <div key={ev.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">공구 {i + 1}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusColor}`}>{statusLabel}</span>
                            </div>
                            <button onClick={() => remove(ev.id)} className="cursor-pointer text-[10px] text-red-400 hover:text-red-600">삭제</button>
                          </div>
                          <input type="text" value={ev.title}
                            onChange={e => update(i, { title: e.target.value })}
                            placeholder="공구명 (예: 오설록 가을 공구)"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-400 uppercase">오픈일</label>
                              <input type="date" value={ev.start_date}
                                onChange={e => update(i, { start_date: e.target.value })}
                                className="w-full mt-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#C41E1E]" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-400 uppercase">종료일</label>
                              <input type="date" value={ev.end_date}
                                onChange={e => update(i, { end_date: e.target.value })}
                                className="w-full mt-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#C41E1E]" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-400 uppercase">가격 (원)</label>
                              <input type="number" value={ev.price ?? ""}
                                onChange={e => update(i, { price: parseInt(e.target.value) || undefined })}
                                placeholder="35000"
                                className="w-full mt-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#C41E1E]" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-400 uppercase">플랫폼</label>
                              <select value={ev.platform || ""}
                                onChange={e => update(i, { platform: e.target.value })}
                                className="w-full mt-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#C41E1E]">
                                <option value="">선택</option>
                                <option value="쿠팡">쿠팡</option>
                                <option value="네이버">네이버</option>
                                <option value="자사몰">자사몰</option>
                                <option value="인스타">인스타</option>
                                <option value="기타">기타</option>
                              </select>
                            </div>
                          </div>
                          <input type="url" value={ev.link_url || ""}
                            onChange={e => update(i, { link_url: e.target.value })}
                            placeholder="공구 링크 (https://...)"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#C41E1E]" />
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase">대표 이미지 (선택)</label>
                            <div className="mt-0.5">
                              <ImageUpload value={ev.image || ""} onChange={(url) => update(i, { image: url || null })} aspect="1/1" label="이미지" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button onClick={addEvent}
                  className="mt-2 cursor-pointer w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-xs font-medium text-gray-400 hover:border-[#C41E1E] hover:text-[#C41E1E] transition-colors">
                  + 공구 일정 추가
                </button>
              </div>
            </>
          );
        })()}
        {block.type === "campaign_live" && (<p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">진행 중인 공구가 자동 표시됩니다</p>)}
        {block.type === "campaign_teaser" && (<p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">오픈 예정 공구가 자동 표시됩니다</p>)}
      </div>
    </div>
  );
}

// ─── 프리뷰 ───
function BlockPreview({ block, isSelected }: { block: ShopBlock; isSelected: boolean }) {
  const d = block.data;
  const ring = isSelected ? "ring-2 ring-[#C41E1E] ring-offset-1 rounded-lg" : "";

  switch (block.type) {
    case "hero": return (
      <div className={ring}>
        <div className="h-24 bg-gradient-to-br from-[#C41E1E] via-[#a01818] to-[#111111] overflow-hidden">
          {(d.cover_url as string) ? <img src={d.cover_url as string} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="px-3 -mt-6 relative">
          <div className="flex items-end gap-2">
            <div className="h-12 w-12 rounded-full border-[3px] border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
              {(d.profile_url as string) ? <img src={d.profile_url as string} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="text-gray-400 text-sm">👤</span>}
            </div>
            <div className="pb-0.5"><p className="text-[11px] font-bold text-gray-900">{(d.name as string) || "내 쇼핑몰"}</p>
              {(d.bio as string) && <p className="text-[8px] text-gray-400 line-clamp-1">{d.bio as string}</p>}</div>
          </div>
        </div>
      </div>
    );
    case "text": return <div className={`px-3 py-2 ${ring}`}><p className="text-[9px] text-gray-600 whitespace-pre-wrap line-clamp-4 leading-relaxed">{(d.content as string) || "텍스트를 입력하세요..."}</p></div>;
    case "image": return <div className={`px-3 py-2 ${ring}`}>{(d.url as string) ? <img src={d.url as string} alt="" className="w-full rounded-lg shadow-sm" /> : <div className="h-20 rounded-lg bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">🖼️</div>}</div>;
    case "banner": return (
      <div className={`px-3 py-2 ${ring}`}>
        <div className="rounded-xl bg-gradient-to-r from-[#C41E1E] to-[#8B1515] p-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mt-4 -mr-4" />
          {(d.dday as number) !== undefined && <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-bold text-white mb-1">D-{d.dday as number}</span>}
          <p className="text-[10px] font-bold text-white">{(d.title as string) || "배너 제목"}</p>
          {(d.subtitle as string) && <p className="text-[7px] text-white/70 mt-0.5">{d.subtitle as string}</p>}
          <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[7px] font-bold text-[#C41E1E]">자세히 →</span>
        </div>
      </div>
    );
    case "links": { const items = (d.items as LinkItem[]) || []; return (
      <div className={`px-3 py-2 ${ring}`}>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {items.slice(0, 6).map(item => (
            <div key={item.id} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-white shadow-sm">
              <span className="text-[10px]">{item.icon}</span>
            </div>
          ))}
        </div>
      </div>
    ); }
    case "picks": return (
      <div className={`px-3 py-2 ${ring}`}><p className="text-[8px] font-bold text-gray-900 mb-1.5">📦 PICK</p>
        <div className="grid grid-cols-3 gap-1">{[1, 2, 3].map(i => (<div key={i} className="rounded-lg bg-gray-100 aspect-square flex items-center justify-center text-[8px] text-gray-300">📦</div>))}</div>
      </div>
    );
    case "video": { const url = (d.youtube_url as string) || ""; const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); return (
      <div className={`px-3 py-2 ${ring}`}>{m ? <div className="aspect-video rounded-lg overflow-hidden shadow-sm"><iframe src={`https://www.youtube.com/embed/${m[1]}`} className="h-full w-full" /></div> : <div className="aspect-video rounded-lg bg-gray-900 flex items-center justify-center"><span className="text-white/30 text-lg">▶</span></div>}</div>
    ); }
    case "divider": return <div className={`px-6 py-3 ${ring}`}><hr className="border-gray-100" /></div>;
    case "calendar": {
      const evs = (d.manual_events as { id: string; title: string; start_date: string; status: string }[]) || [];
      const active = evs.filter(e => e.status === "active").length;
      const upcoming = evs.filter(e => e.status === "upcoming").length;
      return (
        <div className={`px-3 py-2 ${ring}`}>
          <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px]">📅</span>
              <span className="text-[9px] font-bold text-gray-900">공구 캘린더</span>
              {evs.length > 0 && <span className="ml-auto text-[7px] text-gray-400">{evs.length}건</span>}
            </div>
            {evs.length === 0 ? (
              <div className="text-center py-3 text-[8px] text-gray-300">공구 일정이 비어있어요</div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5 text-[6px] text-center">
                {Array.from({ length: 28 }).map((_, i) => {
                  const hasEv = i < evs.length * 3;
                  return (
                    <div key={i} className={`aspect-square rounded flex items-center justify-center ${hasEv ? "bg-[#C41E1E]/20 text-[#C41E1E] font-bold" : "bg-gray-50 text-gray-300"}`}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            )}
            {(active > 0 || upcoming > 0) && (
              <div className="flex gap-1 mt-1.5 text-[7px]">
                {active > 0 && <span className="rounded-full bg-green-100 text-green-700 px-1.5 py-0.5">진행 {active}</span>}
                {upcoming > 0 && <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5">예정 {upcoming}</span>}
              </div>
            )}
          </div>
        </div>
      );
    }
    case "campaign_live": return <div className={`px-3 py-2 ${ring}`}><div className="rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 p-2"><p className="text-[8px] font-bold text-green-700">🔴 LIVE 공구</p></div></div>;
    case "campaign_teaser": return <div className={`px-3 py-2 ${ring}`}><div className="rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200 p-2"><p className="text-[8px] font-bold text-orange-700">🔔 오픈 예정</p></div></div>;
    case "gallery": { const imgs = (d.images as string[]) || []; const c = (d.columns as number) || 2; return (
      <div className={`px-3 py-2 ${ring}`}><div className={`grid gap-1 ${c === 2 ? "grid-cols-2" : c === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {imgs.length > 0 ? imgs.slice(0, 6).map((img, i) => <img key={i} src={img} alt="" className="w-full aspect-square rounded-lg object-cover" />) : [1, 2, 3, 4].map(i => <div key={i} className="rounded-lg bg-gray-100 aspect-square flex items-center justify-center text-[7px] text-gray-300">🎨</div>)}
      </div></div>
    ); }
    default: return null;
  }
}

// ─── 이미지 업로드 헬퍼 ───
function ImageUpload({ value, onChange, aspect = "16/9", rounded = false, label = "이미지" }: {
  value: string;
  onChange: (url: string) => void;
  aspect?: "16/9" | "4/3" | "1/1";
  rounded?: boolean;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputId = React.useId();

  const aspectClass = aspect === "16/9" ? "aspect-video" : aspect === "4/3" ? "aspect-[4/3]" : "aspect-square";
  const shapeClass = rounded ? "rounded-full" : "rounded-xl";

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErr("이미지 파일만 업로드 가능"); return; }
    if (file.size > 5 * 1024 * 1024) { setErr("5MB 이하만 업로드 가능"); return; }
    setErr(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setErr(data.error || "업로드 실패");
        return;
      }
      onChange(data.url);
    } catch {
      setErr("네트워크 오류");
    } finally {
      setUploading(false);
      setTimeout(() => setErr(""), 5000);
    }
  };

  return (
    <div>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        className="hidden"
      />
      {value ? (
        <div className="relative group">
          <div className={`${aspectClass} ${shapeClass} overflow-hidden border border-gray-200 bg-gray-100 ${rounded ? "w-20 h-20 aspect-square" : "w-full"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <label htmlFor={inputId}
              className="cursor-pointer flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-[11px] font-medium text-gray-600 hover:bg-gray-50">
              {uploading ? "업로드 중…" : "변경"}
            </label>
            <button type="button" onClick={() => onChange("")}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-500">
              삭제
            </button>
          </div>
        </div>
      ) : (
        <label htmlFor={inputId}
          className={`${aspectClass} ${shapeClass} ${rounded ? "w-20 h-20 aspect-square" : "w-full"} flex flex-col items-center justify-center gap-1 cursor-pointer border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 hover:border-[#C41E1E] hover:bg-[#fff5f5] hover:text-[#C41E1E] transition-colors`}>
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
              <span className="text-[10px]">업로드 중…</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-medium">{label} 추가</span>
              <span className="text-[9px] opacity-60">클릭해서 업로드</span>
            </>
          )}
        </label>
      )}
      {err && <p className="mt-1 text-[10px] text-red-500">{err}</p>}
    </div>
  );
}

// ─── 스타일 패널 (테마/배경/폰트/블록) ───
function StylePanel({ theme, setTheme, applyPreset }: {
  theme: ShopTheme;
  setTheme: React.Dispatch<React.SetStateAction<ShopTheme>>;
  applyPreset: (key: ThemePreset) => void;
}) {
  const updateBlock = (patch: Partial<ShopTheme["block"]>) =>
    setTheme(prev => ({ ...prev, block: { ...prev.block, ...patch } }));

  return (
    <div className="hidden md:block space-y-5">
      {/* 테마 프리셋 */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">테마</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => {
            const active = theme.preset === p.key;
            return (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className={`relative cursor-pointer rounded-lg border p-2 text-left transition-all ${
                  active ? "border-[#C41E1E] ring-2 ring-[#C41E1E]/20" : "border-gray-200 hover:border-gray-300"
                }`}>
                <div className="mb-1.5 h-10 rounded" style={{ background: p.bg, border: "1px solid rgba(0,0,0,0.05)" }}>
                  <div className="h-full flex items-center justify-center text-[10px] font-bold" style={{ color: p.fg }}>Aa</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.accent }} />
                  <span className="text-[10px] font-medium text-gray-700">{p.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 배경색 직접 선택 */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">배경</h4>
        <div className="grid grid-cols-6 gap-1.5">
          {BG_COLORS.map(c => {
            const active = theme.bg.toUpperCase() === c.value.toUpperCase();
            return (
              <button key={c.value} onClick={() => setTheme(prev => ({ ...prev, bg: c.value, preset: "custom" }))}
                title={c.label}
                className={`h-7 w-7 cursor-pointer rounded-full border-2 transition-transform ${
                  active ? "border-[#C41E1E] scale-110" : "border-gray-200 hover:scale-105"
                }`}
                style={{ background: c.value }} />
            );
          })}
        </div>
      </section>

      {/* 강조색 custom */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">강조색</h4>
        <div className="flex items-center gap-2">
          <input type="color" value={theme.accent}
            onChange={(e) => setTheme(prev => ({ ...prev, accent: e.target.value, preset: "custom" }))}
            className="h-9 w-9 cursor-pointer rounded-lg border border-gray-200" />
          <input type="text" value={theme.accent}
            onChange={(e) => setTheme(prev => ({ ...prev, accent: e.target.value, preset: "custom" }))}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#C41E1E]" />
        </div>
      </section>

      {/* 폰트 */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">폰트</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {FONTS.map(f => {
            const active = theme.font === f.key;
            return (
              <button key={f.key} onClick={() => setTheme(prev => ({ ...prev, font: f.key }))}
                className={`cursor-pointer rounded-lg border py-2 px-2 text-xs font-bold transition-all ${
                  active ? "border-[#C41E1E] bg-[#FFF5F5] text-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
                style={{ fontFamily: f.cssFamily }}>
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 블록 모양 */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">블록 모양</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {(["square", "rounded", "pill"] as BlockShape[]).map(s => {
            const active = theme.block.shape === s;
            const radius = s === "square" ? "4px" : s === "rounded" ? "12px" : "999px";
            return (
              <button key={s} onClick={() => updateBlock({ shape: s })}
                className={`cursor-pointer border h-11 p-1 transition-all flex items-center justify-center ${
                  active ? "border-[#C41E1E] bg-[#FFF5F5]" : "border-gray-200 hover:border-gray-300"
                }`}
                style={{ borderRadius: s === "square" ? "8px" : s === "rounded" ? "12px" : "22px" }}>
                <span className="inline-block h-5 w-full bg-gray-200" style={{ borderRadius: radius }} />
              </button>
            );
          })}
        </div>
      </section>

      {/* 그림자 */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">그림자</h4>
        <div className="grid grid-cols-4 gap-1.5">
          {(["none", "soft", "hard", "strong"] as BlockShadow[]).map(s => {
            const active = theme.block.shadow === s;
            const shadows = { none: "none", soft: "0 1px 3px rgba(0,0,0,.08)", hard: "0 4px 12px rgba(0,0,0,.12)", strong: "0 10px 25px rgba(0,0,0,.18)" };
            return (
              <button key={s} onClick={() => updateBlock({ shadow: s })}
                className={`cursor-pointer rounded-lg border py-2 text-[10px] font-medium transition-all ${
                  active ? "border-[#C41E1E] bg-[#FFF5F5] text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
                style={{ boxShadow: shadows[s] }}>
                {s === "none" ? "없음" : s === "soft" ? "연" : s === "hard" ? "진" : "강"}
              </button>
            );
          })}
        </div>
      </section>

      {/* 정렬 */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">정렬</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {(["left", "center"] as BlockAlign[]).map(a => {
            const active = theme.block.align === a;
            return (
              <button key={a} onClick={() => updateBlock({ align: a })}
                className={`cursor-pointer rounded-lg border py-2 text-[11px] font-medium transition-all ${
                  active ? "border-[#C41E1E] bg-[#FFF5F5] text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                {a === "left" ? "⬅️ 왼쪽" : "⬌ 중앙"}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// 모바일에서 StylePanel을 보여주기 위한 래퍼는 생략 (스타일 패널은 PC 전용)
// ─── 메인 ───
export default function ShopCustomize() {
  const [blocks, setBlocks] = useState<ShopBlock[]>(DEFAULT_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>("b1");
  const [showPalette, setShowPalette] = useState(false);
  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  // 스타일(테마) 관련
  const [sideTab, setSideTab] = useState<"blocks" | "style">("blocks");
  const [theme, setTheme] = useState<ShopTheme>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // 초기 로드 — /api/me에서 저장된 theme + blocks 가져오기
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        const shop = data?.creator_shops?.[0];
        if (!alive || !shop) return;
        if (shop.theme) setTheme(normalizeTheme(shop.theme));
        if (Array.isArray(shop.link_blocks) && shop.link_blocks.length > 0) {
          setBlocks(shop.link_blocks);
        }
      } catch { /* 그대로 기본값 */ }
    })();
    return () => { alive = false; };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true); setSaveMsg("");
    try {
      // link_blocks 컬럼에 전체 블록 트리 저장 (creator_shops.link_blocks JSONB)
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, link_blocks: blocks }),
      });
      if (res.ok) { setSaveMsg("✅ 저장됨"); setTimeout(() => setSaveMsg(""), 2500); }
      else setSaveMsg("⚠️ 저장 실패");
    } catch { setSaveMsg("⚠️ 네트워크 오류"); }
    finally { setSaving(false); }
  }, [theme, blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks(prev => { const o = prev.findIndex(b => b.id === active.id); const n = prev.findIndex(b => b.id === over.id); return arrayMove(prev, o, n); });
    }
  }, []);

  const addBlock = useCallback((type: ShopBlock["type"]) => {
    const dd: Record<string, Record<string, unknown>> = {
      hero: { name: "내 쇼핑몰", bio: "", cover_url: "", profile_url: "" }, text: { content: "" }, image: { url: "", caption: "" },
      banner: { title: "", subtitle: "", link_url: "", dday: 3 }, links: { items: [] }, picks: { filter: "all", limit: 12 },
      video: { youtube_url: "" }, divider: {}, gallery: { images: [], columns: 2 },
    };
    const nb: ShopBlock = { id: newId(), type, data: dd[type] || {} };
    setBlocks(prev => [...prev, nb]); setSelectedId(nb.id); setShowPalette(false);
  }, []);

  // 프리셋 선택 시 accent/bg/fg 일괄 교체
  const applyPreset = useCallback((key: ThemePreset) => {
    const p = PRESETS.find(x => x.key === key);
    if (!p) return;
    setTheme(prev => ({ ...prev, preset: key, accent: p.accent, bg: p.bg, fg: p.fg }));
  }, []);

  return (
    <div className="flex h-full bg-[#FAFAFA] relative">
      {/* ─────────── Col 1: 블록 / 스타일 (PC 전체 / Mobile 아이콘) ─────────── */}
      <div className="w-[64px] md:w-[220px] shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* 탭 토글: 블록 | 스타일 */}
        <div className="p-2 md:p-4 border-b border-gray-100">
          <div className="hidden md:flex mb-3 rounded-lg bg-gray-100 p-0.5">
            <button onClick={() => setSideTab("blocks")}
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-bold transition-all ${
                sideTab === "blocks" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>블록</button>
            <button onClick={() => setSideTab("style")}
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-bold transition-all ${
                sideTab === "style" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>스타일</button>
          </div>
          {/* 모바일: 아이콘 2개 수직 */}
          <div className="md:hidden flex flex-col items-center gap-1.5 mb-2">
            <button onClick={() => setSideTab("blocks")} title="블록"
              className={`h-9 w-9 cursor-pointer rounded-lg flex items-center justify-center text-base ${
                sideTab === "blocks" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}>🧱</button>
            <button onClick={() => setSideTab("style")} title="스타일"
              className={`h-9 w-9 cursor-pointer rounded-lg flex items-center justify-center text-base ${
                sideTab === "style" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}>🎨</button>
          </div>

          {sideTab === "blocks" && (
            <button onClick={() => setShowPalette(!showPalette)}
              title="블록 추가"
              className={`cursor-pointer flex items-center justify-center rounded-lg md:w-full h-10 md:h-auto w-10 md:px-3 md:py-2 text-xs font-bold transition-all ${
                showPalette ? "bg-gray-900 text-white" : "bg-[#C41E1E] text-white hover:bg-[#A01818] shadow-sm"
              }`}>
              <span className="md:hidden text-lg">{showPalette ? "✕" : "+"}</span>
              <span className="hidden md:inline">{showPalette ? "✕ 닫기" : "+ 블록 추가"}</span>
            </button>
          )}
        </div>

        {/* 팔레트 (모바일: 오버레이, PC: 인라인) */}
        {sideTab === "blocks" && showPalette && (
          <>
            {/* 모바일: 아래에서 올라오는 시트 */}
            <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowPalette(false)}>
              <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">블록 추가</h4>
                  <button onClick={() => setShowPalette(false)} className="cursor-pointer text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => addBlock(bt.type)} className="cursor-pointer flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white p-3 hover:border-[#C41E1E] hover:shadow-md transition-all group">
                      <span className="text-xl">{bt.icon}</span>
                      <span className="text-[10px] font-bold text-gray-600">{bt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PC: 인라인 팔레트 */}
            <div className="hidden md:block p-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => addBlock(bt.type)} className="cursor-pointer flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white p-2.5 hover:border-[#C41E1E] hover:shadow-md transition-all group">
                    <span className="text-lg group-hover:scale-110 transition-transform">{bt.icon}</span>
                    <span className="text-[10px] font-bold text-gray-600 group-hover:text-[#C41E1E]">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 블록 리스트 OR 스타일 패널 */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          {sideTab === "blocks" ? (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {/* 모바일: 아이콘 버전 */}
                  <div className="md:hidden flex flex-col items-center gap-2">
                    {blocks.map(block => (
                      <SortableBlock key={block.id} block={block} isSelected={selectedId === block.id} compact
                        onSelect={() => setSelectedId(block.id)} onDelete={() => { setBlocks(prev => prev.filter(b => b.id !== block.id)); if (selectedId === block.id) setSelectedId(null); }} />
                    ))}
                  </div>
                  {/* PC: 전체 버전 */}
                  <div className="hidden md:block space-y-1.5">
                    {blocks.map(block => (
                      <SortableBlock key={block.id} block={block} isSelected={selectedId === block.id}
                        onSelect={() => setSelectedId(block.id)} onDelete={() => { setBlocks(prev => prev.filter(b => b.id !== block.id)); if (selectedId === block.id) setSelectedId(null); }} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <p className="hidden md:block mt-4 text-[10px] leading-relaxed text-gray-400">
                💡 자유롭게 블록을 추가하고, <b>드래그로 위·아래 순서</b>를 조정하세요. 블록을 클릭하면 오른쪽에서 편집할 수 있어요.
              </p>
            </>
          ) : (
            <StylePanel theme={theme} setTheme={setTheme} applyPreset={applyPreset} />
          )}
        </div>

        {/* 하단 저장 버튼 */}
        <div className="border-t border-gray-100 p-2 md:p-4 bg-white space-y-2">
          <button onClick={handleSave} disabled={saving} title="저장"
            className="cursor-pointer w-full flex items-center justify-center rounded-xl bg-[#C41E1E] h-10 md:py-3 text-sm font-bold text-white hover:bg-[#A01818] shadow-sm disabled:opacity-60 disabled:cursor-default">
            <span className="md:hidden">{saving ? "…" : "💾"}</span>
            <span className="hidden md:inline">{saving ? "저장 중…" : "저장"}</span>
          </button>
          {saveMsg && <p className="hidden md:block text-center text-[10px] text-gray-500">{saveMsg}</p>}
          <a href="/shop/gwibinjeong" target="_blank" rel="noopener noreferrer"
            title="내 쇼핑몰 보기"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 h-10 md:py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span className="hidden md:inline">내 쇼핑몰 보기</span>
          </a>
        </div>
      </div>

      {/* ─────────── Col 2: 편집 패널 (PC only) ─────────── */}
      <div className="hidden md:flex md:w-[320px] shrink-0 bg-white border-r border-gray-100 flex-col">
        {selectedBlock ? (
          <div className="flex-1 overflow-y-auto p-5">
            <BlockEditor block={selectedBlock} onChange={data => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, data } : b))} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-3xl mb-3">👈</p>
              <p className="text-sm font-medium text-gray-900">블록을 선택하세요</p>
              <p className="text-xs text-gray-400 mt-1">왼쪽에서 편집할 블록을<br />클릭하면 여기에 표시됩니다</p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────── Col 3: 미리보기 ─────────── */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="w-[280px] md:w-[320px] rounded-[3rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
          <div className="flex justify-center bg-gray-900 pt-2 pb-1.5"><div className="h-[24px] w-[90px] rounded-full bg-black" /></div>
          <div
            className="h-[620px] overflow-y-auto"
            style={{
              ...themeToCssVars(theme),
              background: theme.bg,
              color: theme.fg,
              fontFamily: "var(--font-sans)",
            }}
          >
            {blocks.map(block => (
              <div key={block.id} onClick={() => setSelectedId(block.id)} className="cursor-pointer">
                <BlockPreview block={block} isSelected={selectedId === block.id} />
              </div>
            ))}
            {blocks.length === 0 && <div className="flex items-center justify-center h-full opacity-40 text-xs">블록을 추가하세요</div>}
            <div className="py-4 text-center"><p className="text-[7px] opacity-50">Powered by <span className="font-bold"><span style={{ color: theme.accent }}>Tube</span><span>Ping</span></span></p></div>
          </div>
          <div className="flex justify-center bg-gray-900 py-2"><div className="h-[4px] w-[80px] rounded-full bg-gray-600" /></div>
        </div>
      </div>

      {/* ─────────── Mobile 바텀시트: 편집 패널 ─────────── */}
      {selectedBlock && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl max-h-[65vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">{BLOCK_TYPES.find(t => t.type === selectedBlock.type)?.icon}</span>
              <span className="text-sm font-bold text-gray-900">{BLOCK_TYPES.find(t => t.type === selectedBlock.type)?.label} 설정</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setBlocks(prev => prev.filter(b => b.id !== selectedBlock.id)); setSelectedId(null); }}
                className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:text-[#C41E1E] hover:bg-red-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <button onClick={() => setSelectedId(null)} className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-5">
            <BlockEditor block={selectedBlock} onChange={data => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, data } : b))} />
          </div>
        </div>
      )}
    </div>
  );
}
