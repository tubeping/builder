/**
 * 몰 꾸미기 "스타일" — 테마/배경/폰트/블록 커스터마이징
 *
 * creator_shops.theme (jsonb) 에 저장하고, 공개 몰 렌더 시 CSS 변수로 주입.
 * 대시보드 미리보기와 공개 몰 양쪽에서 동일 로직으로 쓰기 위해 분리.
 */

export type ThemePreset =
  | "light"
  | "dark"
  | "tubeping"
  | "pink"
  | "blue"
  | "black"
  | "purple"
  | "custom";

export type BlockShape = "square" | "rounded" | "pill";
export type BlockShadow = "none" | "soft" | "hard" | "strong";
export type BlockAlign = "left" | "center";
export type BlockAnim = "none" | "wave" | "bounce";
export type FontKey =
  | "pretendard"
  | "nanum_myeongjo"
  | "black_han_sans"
  | "gaegu"
  | "jua"
  | "sunflower";

export interface ShopTheme {
  preset: ThemePreset;
  accent: string;  // 강조·버튼·링크
  bg: string;      // 배경
  fg: string;      // 텍스트
  font: FontKey;
  block: {
    shape: BlockShape;
    shadow: BlockShadow;
    align: BlockAlign;
    anim: BlockAnim;
  };
}

export const DEFAULT_THEME: ShopTheme = {
  preset: "light",
  accent: "#C41E1E",
  bg: "#FFFFFF",
  fg: "#111111",
  font: "pretendard",
  block: { shape: "rounded", shadow: "soft", align: "center", anim: "none" },
};

export const PRESETS: { key: ThemePreset; label: string; accent: string; bg: string; fg: string }[] = [
  { key: "light",    label: "라이트",    accent: "#111111", bg: "#FFFFFF", fg: "#111111" },
  { key: "tubeping", label: "튜핑 레드", accent: "#C41E1E", bg: "#FFFFFF", fg: "#111111" },
  { key: "pink",     label: "파스텔 핑크", accent: "#EC4899", bg: "#FDF2F8", fg: "#1F2937" },
  { key: "blue",     label: "블루",      accent: "#2563EB", bg: "#EFF6FF", fg: "#1F2937" },
  { key: "dark",     label: "다크",      accent: "#FFFFFF", bg: "#0A0A0A", fg: "#FFFFFF" },
  { key: "black",    label: "블랙 포인트", accent: "#C41E1E", bg: "#111111", fg: "#FFFFFF" },
  { key: "purple",   label: "퍼플",      accent: "#7C3AED", bg: "#F5F3FF", fg: "#1F2937" },
];

// 배경 팔레트 (12색)
export const BG_COLORS: { value: string; label: string }[] = [
  { value: "#FFFFFF", label: "화이트" },
  { value: "#FFF0F3", label: "베이비핑크" },
  { value: "#FCE7F3", label: "핑크" },
  { value: "#FEF3C7", label: "크림" },
  { value: "#FED7AA", label: "피치" },
  { value: "#DCFCE7", label: "민트" },
  { value: "#D1FAE5", label: "세이지" },
  { value: "#DBEAFE", label: "스카이블루" },
  { value: "#E0E7FF", label: "라벤더" },
  { value: "#F3F4F6", label: "그레이" },
  { value: "#1F2937", label: "슬레이트" },
  { value: "#0A0A0A", label: "블랙" },
];

export const FONTS: { key: FontKey; label: string; cssFamily: string }[] = [
  { key: "pretendard",     label: "프리텐다드", cssFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" },
  { key: "nanum_myeongjo", label: "나눔명조",   cssFamily: "'Nanum Myeongjo', 'Pretendard', serif" },
  { key: "black_han_sans", label: "블랙한산스", cssFamily: "'Black Han Sans', 'Pretendard', sans-serif" },
  { key: "gaegu",          label: "개구",      cssFamily: "'Gaegu', 'Pretendard', cursive" },
  { key: "jua",            label: "주아",      cssFamily: "'Jua', 'Pretendard', sans-serif" },
  { key: "sunflower",      label: "선플라워",   cssFamily: "'Sunflower', 'Pretendard', sans-serif" },
];

// 블록 모서리 (CSS radius)
export const SHAPE_RADIUS: Record<BlockShape, string> = {
  square: "6px",
  rounded: "14px",
  pill: "999px",
};

// 블록 그림자
export const SHADOW_VALUE: Record<BlockShadow, string> = {
  none: "none",
  soft: "0 1px 3px rgba(0,0,0,0.08)",
  hard: "0 4px 12px rgba(0,0,0,0.12)",
  strong: "0 10px 25px rgba(0,0,0,0.18)",
};

export function fontCss(font: FontKey): string {
  return FONTS.find((f) => f.key === font)?.cssFamily || FONTS[0].cssFamily;
}

/**
 * theme → CSS 변수 객체. 공개 몰·미리보기 루트 div에 inline style로 주입.
 * 각 블록은 var(--accent) / var(--shop-bg) / var(--shop-fg) / var(--font-sans)
 * / var(--block-radius) / var(--block-shadow) 로 참조.
 */
export function themeToCssVars(theme: Partial<ShopTheme> | null | undefined): React.CSSProperties {
  const t = normalizeTheme(theme);
  return {
    // CSS 변수는 타입상 CSSProperties 바깥 키라 Record<string,string>로 캐스트 필요
    ["--accent" as string]: t.accent,
    ["--shop-bg" as string]: t.bg,
    ["--shop-fg" as string]: t.fg,
    ["--font-sans" as string]: fontCss(t.font),
    ["--block-radius" as string]: SHAPE_RADIUS[t.block.shape],
    ["--block-shadow" as string]: SHADOW_VALUE[t.block.shadow],
    ["--block-align" as string]: t.block.align === "center" ? "center" : "flex-start",
  } as React.CSSProperties;
}

/** 저장된 값이 부분 객체일 수 있어 기본값으로 채움 */
export function normalizeTheme(t: Partial<ShopTheme> | null | undefined): ShopTheme {
  if (!t) return { ...DEFAULT_THEME };
  return {
    preset: t.preset ?? DEFAULT_THEME.preset,
    accent: t.accent ?? DEFAULT_THEME.accent,
    bg: t.bg ?? DEFAULT_THEME.bg,
    fg: t.fg ?? DEFAULT_THEME.fg,
    font: t.font ?? DEFAULT_THEME.font,
    block: {
      shape: t.block?.shape ?? DEFAULT_THEME.block.shape,
      shadow: t.block?.shadow ?? DEFAULT_THEME.block.shadow,
      align: t.block?.align ?? DEFAULT_THEME.block.align,
      anim: t.block?.anim ?? DEFAULT_THEME.block.anim,
    },
  };
}
