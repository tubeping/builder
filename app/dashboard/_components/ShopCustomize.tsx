"use client";

import React, { useState, useCallback } from "react";

// ─── 블록 타입 ───
interface ShopBlock {
  id: string;
  type: "hero" | "text" | "image" | "banner" | "links" | "picks" | "video" | "divider" | "gallery";
  data: Record<string, unknown>;
}

interface LinkItem {
  id: string;
  label: string;
  url: string;
  icon: string;
}

// ─── 블록 팔레트 ───
const BLOCK_TYPES: { type: ShopBlock["type"]; label: string; icon: string; desc: string }[] = [
  { type: "hero", label: "프로필", icon: "👤", desc: "커버 + 프로필 + 소개" },
  { type: "text", label: "텍스트", icon: "📝", desc: "자유 텍스트" },
  { type: "image", label: "이미지", icon: "🖼️", desc: "이미지 + 캡션" },
  { type: "banner", label: "배너", icon: "🔥", desc: "공구/이벤트 배너" },
  { type: "links", label: "링크", icon: "🔗", desc: "SNS/외부 링크" },
  { type: "picks", label: "상품", icon: "📦", desc: "내 PICK 상품" },
  { type: "video", label: "영상", icon: "▶️", desc: "유튜브 임베드" },
  { type: "divider", label: "구분선", icon: "—", desc: "구분선" },
  { type: "gallery", label: "갤러리", icon: "🎨", desc: "이미지 갤러리" },
];

// ─── 기본 블록 ───
const DEFAULT_BLOCKS: ShopBlock[] = [
  { id: "b1", type: "hero", data: { name: "내 쇼핑몰", bio: "", cover_url: "", profile_url: "" } },
  { id: "b2", type: "links", data: { items: [{ id: "l1", label: "Instagram", url: "", icon: "📷" }, { id: "l2", label: "YouTube", url: "", icon: "▶️" }] } },
  { id: "b3", type: "picks", data: { filter: "all", limit: 12 } },
];

let blockCounter = 100;
function newId() { return "b" + (++blockCounter) + "_" + Date.now(); }

// ─── 블록별 편집 패널 ───
function BlockEditor({ block, onChange }: { block: ShopBlock; onChange: (data: Record<string, unknown>) => void }) {
  const d = block.data;

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">프로필 설정</h4>
          <div>
            <label className="mb-1 block text-xs text-gray-600">쇼핑몰 이름</label>
            <input type="text" value={(d.name as string) || ""} onChange={e => onChange({ ...d, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">소개글</label>
            <textarea value={(d.bio as string) || ""} onChange={e => onChange({ ...d, bio: e.target.value })} rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E] resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">커버 이미지 URL</label>
            <input type="url" value={(d.cover_url as string) || ""} onChange={e => onChange({ ...d, cover_url: e.target.value })}
              placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">프로필 이미지 URL</label>
            <input type="url" value={(d.profile_url as string) || ""} onChange={e => onChange({ ...d, profile_url: e.target.value })}
              placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">텍스트</h4>
          <textarea value={(d.content as string) || ""} onChange={e => onChange({ ...d, content: e.target.value })} rows={6}
            placeholder="자유롭게 텍스트를 입력하세요. 내러티브, 소개, 공지 등"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E] resize-none" />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">이미지</h4>
          <div>
            <label className="mb-1 block text-xs text-gray-600">이미지 URL</label>
            <input type="url" value={(d.url as string) || ""} onChange={e => onChange({ ...d, url: e.target.value })}
              placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">캡션 (선택)</label>
            <input type="text" value={(d.caption as string) || ""} onChange={e => onChange({ ...d, caption: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
        </div>
      );

    case "banner":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">배너</h4>
          <div>
            <label className="mb-1 block text-xs text-gray-600">제목</label>
            <input type="text" value={(d.title as string) || ""} onChange={e => onChange({ ...d, title: e.target.value })}
              placeholder="이번 주 공구!" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">부제목</label>
            <input type="text" value={(d.subtitle as string) || ""} onChange={e => onChange({ ...d, subtitle: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">링크 URL</label>
            <input type="url" value={(d.link_url as string) || ""} onChange={e => onChange({ ...d, link_url: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">D-day</label>
            <input type="number" value={(d.dday as number) ?? ""} onChange={e => onChange({ ...d, dday: parseInt(e.target.value) || 0 })}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">배너 이미지 URL (선택)</label>
            <input type="url" value={(d.image_url as string) || ""} onChange={e => onChange({ ...d, image_url: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
        </div>
      );

    case "links": {
      const items = (d.items as LinkItem[]) || [];
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">링크 블록</h4>
          {items.map((item, i) => (
            <div key={item.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">링크 {i + 1}</span>
                <button onClick={() => onChange({ ...d, items: items.filter(x => x.id !== item.id) })}
                  className="cursor-pointer text-xs text-red-400 hover:text-red-600">삭제</button>
              </div>
              <input type="text" value={item.icon} onChange={e => { const next = [...items]; next[i] = { ...item, icon: e.target.value }; onChange({ ...d, items: next }); }}
                placeholder="아이콘 (이모지)" className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-center outline-none" />
              <input type="text" value={item.label} onChange={e => { const next = [...items]; next[i] = { ...item, label: e.target.value }; onChange({ ...d, items: next }); }}
                placeholder="라벨" className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none" />
              <input type="url" value={item.url} onChange={e => { const next = [...items]; next[i] = { ...item, url: e.target.value }; onChange({ ...d, items: next }); }}
                placeholder="https://..." className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none" />
            </div>
          ))}
          <button onClick={() => onChange({ ...d, items: [...items, { id: "l" + Date.now(), label: "", url: "", icon: "🔗" }] })}
            className="cursor-pointer w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-gray-400">
            + 링크 추가
          </button>
        </div>
      );
    }

    case "video":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">유튜브 영상</h4>
          <input type="url" value={(d.youtube_url as string) || ""} onChange={e => onChange({ ...d, youtube_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
        </div>
      );

    case "picks":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">상품 PICK</h4>
          <p className="text-xs text-gray-500">내 PICK에 등록된 상품이 자동 표시됩니다</p>
          <div>
            <label className="mb-1 block text-xs text-gray-600">표시 개수</label>
            <input type="number" value={(d.limit as number) || 12} onChange={e => onChange({ ...d, limit: parseInt(e.target.value) || 12 })}
              min={1} max={50} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
          </div>
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900">이미지 갤러리</h4>
          <p className="text-xs text-gray-500">이미지 URL을 줄바꿈으로 구분하세요</p>
          <textarea value={((d.images as string[]) || []).join("\n")}
            onChange={e => onChange({ ...d, images: e.target.value.split("\n").filter(Boolean) })}
            rows={5} placeholder="https://image1.jpg&#10;https://image2.jpg"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E] resize-none font-mono" />
          <div>
            <label className="mb-1 block text-xs text-gray-600">열 수</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => onChange({ ...d, columns: n })}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium ${(d.columns || 2) === n ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-600"}`}>
                  {n}열
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case "divider":
      return (
        <div>
          <h4 className="text-sm font-bold text-gray-900">구분선</h4>
          <p className="mt-1 text-xs text-gray-500">설정 없음 — 섹션 구분용</p>
        </div>
      );

    default:
      return null;
  }
}

// ─── 블록 프리뷰 (모바일 미리보기용) ───
function BlockPreview({ block }: { block: ShopBlock }) {
  const d = block.data;

  switch (block.type) {
    case "hero":
      return (
        <div>
          <div className="h-20 bg-gradient-to-r from-[#C41E1E] to-[#111111] flex items-center justify-center">
            {(d.cover_url as string) ? <img src={d.cover_url as string} alt="" className="h-full w-full object-cover" /> :
              <span className="text-white/80 text-sm font-bold">{(d.name as string) || "내 쇼핑몰"}</span>}
          </div>
          <div className="px-3 -mt-5">
            <div className="flex items-end gap-2">
              <div className="h-10 w-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs">
                {(d.profile_url as string) ? <img src={d.profile_url as string} alt="" className="h-full w-full rounded-full object-cover" /> : "👤"}
              </div>
              <span className="text-xs font-bold">{(d.name as string) || "내 쇼핑몰"}</span>
            </div>
            {(d.bio as string) && <p className="mt-1 text-[9px] text-gray-500 line-clamp-2">{d.bio as string}</p>}
          </div>
        </div>
      );

    case "text":
      return (
        <div className="px-3 py-2">
          <p className="text-[10px] text-gray-700 whitespace-pre-wrap line-clamp-4">{(d.content as string) || "텍스트를 입력하세요"}</p>
        </div>
      );

    case "image":
      return (
        <div className="px-3 py-2">
          {(d.url as string) ? <img src={d.url as string} alt="" className="w-full rounded-lg" /> :
            <div className="h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">🖼️ 이미지</div>}
          {(d.caption as string) && <p className="mt-1 text-center text-[8px] text-gray-400">{d.caption as string}</p>}
        </div>
      );

    case "banner":
      return (
        <div className="px-3 py-2">
          <div className="rounded-lg bg-gradient-to-r from-[#C41E1E] to-[#8B1515] p-3">
            {(d.dday as number) !== undefined && <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[8px] text-white mb-1">D-{d.dday as number}</span>}
            <p className="text-xs font-bold text-white">{(d.title as string) || "배너 제목"}</p>
            {(d.subtitle as string) && <p className="text-[8px] text-white/80 mt-0.5">{d.subtitle as string}</p>}
          </div>
        </div>
      );

    case "links": {
      const items = (d.items as LinkItem[]) || [];
      return (
        <div className="px-3 py-2 space-y-1">
          {items.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1.5">
              <span className="text-xs">{item.icon}</span>
              <span className="text-[9px] text-gray-700">{item.label || "링크"}</span>
            </div>
          ))}
          {items.length > 3 && <p className="text-[8px] text-center text-gray-400">+{items.length - 3}개 더</p>}
        </div>
      );
    }

    case "picks":
      return (
        <div className="px-3 py-2">
          <p className="text-[9px] font-bold text-gray-900 mb-1">📦 PICK 컬렉션</p>
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded bg-gray-100 aspect-square flex items-center justify-center text-[8px] text-gray-400">상품</div>
            ))}
          </div>
        </div>
      );

    case "video": {
      const url = (d.youtube_url as string) || "";
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
      return (
        <div className="px-3 py-2">
          {match ? (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe src={`https://www.youtube.com/embed/${match[1]}`} className="h-full w-full" />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">▶️ 영상</div>
          )}
        </div>
      );
    }

    case "divider":
      return <div className="px-3 py-2"><hr className="border-gray-200" /></div>;

    case "gallery": {
      const images = (d.images as string[]) || [];
      const cols = (d.columns as number) || 2;
      return (
        <div className="px-3 py-2">
          <div className={`grid gap-1 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
            {images.length > 0 ? images.slice(0, 6).map((img, i) => (
              <img key={i} src={img} alt="" className="w-full aspect-square rounded object-cover" />
            )) : [1, 2, 3, 4].map(i => (
              <div key={i} className="rounded bg-gray-100 aspect-square flex items-center justify-center text-[8px] text-gray-300">🎨</div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── 블록 리스트 아이템 ───
function BlockListItem({ block, index, total, isSelected, onSelect, onMoveUp, onMoveDown, onDelete }: {
  block: ShopBlock; index: number; total: number; isSelected: boolean;
  onSelect: () => void; onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}) {
  const meta = BLOCK_TYPES.find(t => t.type === block.type);
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${isSelected ? "border-[#C41E1E] bg-red-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta?.icon}</span>
        <span className="flex-1 text-sm font-medium text-gray-900">{meta?.label}</span>
        <div className="flex gap-1">
          <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0}
            className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1}
            className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="cursor-pointer rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───
export default function ShopCustomize() {
  const [blocks, setBlocks] = useState<ShopBlock[]>(DEFAULT_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_BLOCKS[0]?.id || null);
  const [showPalette, setShowPalette] = useState(false);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  const moveUp = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const addBlock = useCallback((type: ShopBlock["type"]) => {
    const defaultData: Record<string, unknown> = {
      hero: { name: "내 쇼핑몰", bio: "", cover_url: "", profile_url: "" },
      text: { content: "" },
      image: { url: "", caption: "" },
      banner: { title: "", subtitle: "", link_url: "", dday: 3 },
      links: { items: [] },
      picks: { filter: "all", limit: 12 },
      video: { youtube_url: "" },
      divider: {},
      gallery: { images: [], columns: 2 },
    };
    const newBlock: ShopBlock = { id: newId(), type, data: defaultData[type] || {} };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
    setShowPalette(false);
  }, []);

  const updateBlockData = useCallback((id: string, data: Record<string, unknown>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b));
  }, []);

  return (
    <div className="flex h-full">
      {/* ── 왼쪽: 블록 리스트 + 편집 ── */}
      <div className="w-[320px] shrink-0 border-r border-gray-200 overflow-y-auto">
        {/* 블록 리스트 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">블록 구성</h3>
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]"
            >
              + 블록 추가
            </button>
          </div>

          {/* 블록 추가 팔레트 */}
          {showPalette && (
            <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-medium text-gray-700">블록 타입 선택</p>
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.map(bt => (
                  <button
                    key={bt.type}
                    onClick={() => addBlock(bt.type)}
                    className="cursor-pointer flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 hover:border-[#C41E1E] hover:bg-red-50/30 transition-colors"
                  >
                    <span className="text-lg">{bt.icon}</span>
                    <span className="text-[10px] font-medium text-gray-700">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 블록 목록 */}
          <div className="space-y-2">
            {blocks.map((block, idx) => (
              <BlockListItem
                key={block.id}
                block={block}
                index={idx}
                total={blocks.length}
                isSelected={selectedId === block.id}
                onSelect={() => setSelectedId(block.id)}
                onMoveUp={() => moveUp(block.id)}
                onMoveDown={() => moveDown(block.id)}
                onDelete={() => deleteBlock(block.id)}
              />
            ))}
          </div>
        </div>

        {/* 선택된 블록 편집 패널 */}
        {selectedBlock && (
          <div className="border-t border-gray-200 p-4">
            <BlockEditor block={selectedBlock} onChange={data => updateBlockData(selectedBlock.id, data)} />
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="border-t border-gray-200 p-4">
          <button className="cursor-pointer w-full rounded-lg bg-[#C41E1E] py-2.5 text-sm font-bold text-white hover:bg-[#A01818]">
            저장
          </button>
        </div>
      </div>

      {/* ── 오른쪽: 모바일 프리뷰 ── */}
      <div className="flex-1 flex items-start justify-center bg-gray-100 p-6 overflow-y-auto">
        <div className="w-[375px] rounded-[2.5rem] border-[8px] border-[#111111] bg-white shadow-2xl overflow-hidden">
          {/* 노치 */}
          <div className="flex justify-center bg-white pt-2 pb-1">
            <div className="h-[22px] w-[100px] rounded-full bg-[#111111]" />
          </div>

          {/* 콘텐츠 */}
          <div className="h-[680px] overflow-y-auto">
            {blocks.map(block => (
              <div
                key={block.id}
                onClick={() => setSelectedId(block.id)}
                className={`cursor-pointer transition-all ${selectedId === block.id ? "ring-2 ring-[#C41E1E] ring-inset" : ""}`}
              >
                <BlockPreview block={block} />
              </div>
            ))}

            {/* 하단 */}
            <div className="py-4 text-center">
              <p className="text-[8px] text-gray-400">
                Powered by <span className="font-semibold"><span className="text-[#C41E1E]">Tube</span><span className="text-[#111111]">Ping</span></span>
              </p>
            </div>
          </div>

          {/* 홈 바 */}
          <div className="flex justify-center bg-white py-2">
            <div className="h-[4px] w-[100px] rounded-full bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
