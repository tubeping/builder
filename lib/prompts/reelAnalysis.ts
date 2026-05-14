// 릴스 분석 결과 타입 — analyze_reel.py 출력과 1:1 매칭
// G-FRAME 프레임워크 기반 자동 분류 결과

export type HookType =
  | "curiosity"
  | "storytelling"
  | "challenge"
  | "negative"
  | "comparison"
  | "visual_meme";

export type FrameType =
  | "PAS"
  | "BAB"
  | "FAB"
  | "PASTOR"
  | "QUEST"
  | "AIDA"
  | "4P";

export type CTAPattern =
  | "urgency"
  | "scarcity"
  | "popularity"
  | "pressure"
  | "bonus";

export type SectionName =
  | "PROBLEM"
  | "SOLUTION"
  | "DEAL"
  | "EMPATHY"
  | "TRUST";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface SceneDescription {
  time: number;
  desc: string;
}

export interface GFrameHook {
  type: HookType;
  duration_sec: number;
  text: string;
  score: number;
}

export interface GFrameSection {
  name: SectionName;
  range: string;
  text: string;
}

export interface GFrameStructure {
  frame: FrameType;
  sections: GFrameSection[];
}

export interface GFrameCTA {
  pattern: CTAPattern;
  range: string;
  text: string;
  strength: number;
}

export interface GFrame {
  hook: GFrameHook;
  structure: GFrameStructure;
  cta: GFrameCTA;
}

export interface ReelAnalysisMeta {
  url: string;
  duration_sec: number;
  source_username?: string;
}

export interface ReelAnalysisResult {
  meta: ReelAnalysisMeta;
  transcript: TranscriptSegment[];
  scenes: SceneDescription[];
  gframe: GFrame;
  persuasion_tags: string[];
  category: string;
  recommended_for: string[];
  hook_score: number;
  cta_strength: number;
}

// UI 라벨 매핑 (한국어)
export const HOOK_TYPE_LABEL: Record<HookType, string> = {
  curiosity: "호기심형",
  storytelling: "스토리텔링형",
  challenge: "챌린지형",
  negative: "부정/손실형",
  comparison: "비교형",
  visual_meme: "비주얼/밈형",
};

export const FRAME_LABEL: Record<FrameType, string> = {
  PAS: "PAS (문제→확대→해결)",
  BAB: "BAB (Before→After→Bridge)",
  FAB: "FAB (기능→장점→이익)",
  PASTOR: "PASTOR (롱폼 6단)",
  QUEST: "QUEST (타겟 명확형)",
  AIDA: "AIDA (표준 4단)",
  "4P": "4P's (이상→약속→증거→행동)",
};

export const CTA_PATTERN_LABEL: Record<CTAPattern, string> = {
  urgency: "긴급성",
  scarcity: "한정성",
  popularity: "인기도",
  pressure: "구매 압박",
  bonus: "증정",
};

export const SECTION_LABEL: Record<SectionName, string> = {
  PROBLEM: "문제 제기",
  SOLUTION: "솔루션",
  DEAL: "공구 조건",
  EMPATHY: "공감",
  TRUST: "신뢰",
};

// 분석 결과를 스크립트 생성 시 few-shot으로 주입할 때 쓰는 직렬화
export function reelToFewShotExample(reel: ReelAnalysisResult): string {
  const hook = reel.gframe.hook;
  const cta = reel.gframe.cta;
  const sections = reel.gframe.structure.sections
    .map((s) => `  ${SECTION_LABEL[s.name] ?? s.name} ${s.range}: ${s.text}`)
    .join("\n");
  return [
    `# 레퍼런스 릴스 (${reel.category})`,
    `훅 (${HOOK_TYPE_LABEL[hook.type]}, ${hook.duration_sec}초): ${hook.text}`,
    `프레임: ${FRAME_LABEL[reel.gframe.structure.frame]}`,
    sections,
    `CTA (${CTA_PATTERN_LABEL[cta.pattern]}, 강도 ${cta.strength}): ${cta.text}`,
    `심리 태그: ${reel.persuasion_tags.join(", ")}`,
  ].join("\n");
}
