import type {
  ScriptFormat,
  ProductInput,
  GenerationContext,
  LongformOutput,
  ShortsOutput,
  PostOutput,
} from "./prompts/scriptGeneration";

// ─── 유틸 ───
function discountRate(original: number, gonggu: number): number {
  if (!original || original <= 0 || !gonggu) return 0;
  return Math.round((1 - gonggu / original) * 100);
}

function formatKRW(n: number): string {
  if (!n || n <= 0) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

function saveAmount(original: number, gonggu: number): string {
  if (original > 0 && gonggu > 0 && original > gonggu) {
    return (original - gonggu).toLocaleString("ko-KR") + "원";
  }
  return "";
}

// 체험 기간 추출: "3개월 써봤는데..." → "3개월"
function extractPeriod(experience: string): string {
  if (!experience) return "";
  const m = experience.match(/(\d+\s*(?:개월|달|주|일|년))/);
  return m ? m[1] : "";
}

// 체험 텍스트를 bullet으로 쪼개기 (최대 3개)
function splitToBullets(experience: string, max = 3): string[] {
  if (!experience) return [];
  return experience
    .split(/[.。,，\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5)
    .slice(0, max);
}

// 기간 문구
function periodText(start?: string, end?: string): string {
  if (start && end) return `${start} ~ ${end}`;
  if (end) return `~ ${end} 마감`;
  return "공구 기간은 곧 공개됩니다";
}

function endOrSoon(end?: string): string {
  return end ? `${end}까지` : "마감 임박";
}

// 짧은 상품명 (해시태그용): 앞 공백 단어 또는 10자 이내
function shortProductName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  if (first && first.length >= 2) return first.slice(0, 10);
  return name.slice(0, 10);
}

// ─── 롱폼 ───
function generateLongform(
  product: ProductInput,
  context: GenerationContext
): LongformOutput {
  const tone = context.tone || "친근";
  const target = context.target?.trim() || "여러분";
  const period = extractPeriod(context.experience) || "직접";
  const bullets = splitToBullets(context.experience, 3);
  const discount = discountRate(product.originalPrice, product.gongguPrice);
  const save = saveAmount(product.originalPrice, product.gongguPrice);

  // Hook — 톤별 패턴
  let hook = "";
  if (tone === "전문") {
    hook = `${product.productName} 관련해서 제대로 찾아보고 계신 ${target}, 잠깐 이 영상 봐주세요.\n저도 같은 고민이었거든요. 그래서 ${period} 직접 써봤습니다.`;
  } else if (tone === "유머") {
    hook = `${product.productName}, 진짜 ${period} 써봤어요.\n후기 먼저 말씀드리면 — 생각보다 훨씬 괜찮아서 놀랐어요.`;
  } else if (tone === "공감") {
    hook = `혹시 ${target}이세요?\n저랑 똑같은 고민 있으신 분들을 위해 ${product.productName} ${period} 써본 후기 가져왔어요.`;
  } else {
    hook = `안녕하세요!\n오늘은 ${period} 직접 써본 ${product.productName}, 솔직 후기 가져왔어요.\n${target} 분들께 특히 도움 될 거예요.`;
  }

  // Intro
  const firstLine = context.experience.split(/[.。\n]/)[0]?.trim() || "";
  const intro = [
    `${target} 분들, 혹시 이런 고민 있으시죠?`,
    firstLine
      ? `${firstLine}${firstLine.endsWith(".") ? "" : "."} 저도 똑같았어요.`
      : "저도 이런저런 고민이 많았거든요.",
    ``,
    `그러다 ${product.productName}을(를) 알게 됐고, ${period} 직접 써봤어요.`,
    `오늘은 그 경험을 있는 그대로 공유드리려고 해요.`,
  ].join("\n");

  // Benefits — 체험 bullet으로 장점 나열
  const bulletBlock =
    bullets.length > 0
      ? bullets.map((b) => `✅ ${b}`).join("\n")
      : `✅ (체험 포인트를 더 구체적으로 입력하시면 여기에 장점 3가지로 정리됩니다)`;

  const benefits = [
    `제가 ${period} 써보면서 느낀 포인트 정리해드릴게요.`,
    ``,
    bulletBlock,
    ``,
    `다른 제품들과 다르게 이 부분이 확실히 체감됐어요.`,
    `특히 ${target} 분들이라면 더 크게 느끼실 거예요.`,
  ].join("\n");

  // Deal info
  const dealLines = [`💰 이번 공구 조건 공개합니다`, ``];
  if (product.originalPrice > 0) {
    dealLines.push(`정가 ${formatKRW(product.originalPrice)}`);
  }
  if (product.gongguPrice > 0) {
    dealLines.push(`공구가 ${formatKRW(product.gongguPrice)}`);
  }
  if (discount > 0) {
    dealLines.push(`할인율 ${discount}%${save ? ` (${save} 할인)` : ""}`);
  }
  dealLines.push(`공구 기간 ${periodText(product.gongguStart, product.gongguEnd)}`);
  dealLines.push(``);
  dealLines.push(
    `이 가격은 이 공구에서만 가능하고, ${endOrSoon(product.gongguEnd)} 마감이에요.`
  );
  const dealInfo = dealLines.join("\n");

  // CTA
  const cta = [
    `👉 구매 링크는 설명란에 걸어둘게요.`,
    `링크 타고 들어가시면 바로 공구가로 구매 가능하세요.`,
    ``,
    `${endOrSoon(product.gongguEnd)}니까 놓치지 마시고 꼭 챙겨 가세요.`,
    `지난 공구 때도 일찍 마감됐어서, 관심 있으시면 서두르시는 걸 추천드려요.`,
  ].join("\n");

  return { hook, intro, benefits, dealInfo, cta };
}

// ─── 숏폼 ───
function generateShorts(
  product: ProductInput,
  context: GenerationContext
): ShortsOutput {
  const tone = context.tone || "친근";
  const period = extractPeriod(context.experience) || "직접";
  const discount = discountRate(product.originalPrice, product.gongguPrice);
  const firstBullet = splitToBullets(context.experience, 1)[0] || "";

  // Hook — 7단어 이하
  let hook = "";
  if (tone === "전문") {
    hook = `${period} 써본 결과.`;
  } else if (tone === "유머") {
    hook = `이거 몰랐으면 후회할 뻔.`;
  } else if (tone === "공감") {
    hook = `이 고민, 저도 했거든요.`;
  } else {
    hook = `${period} 써보고 놀란 이유.`;
  }

  // Core
  const coreLines: string[] = [];
  coreLines.push(
    firstBullet
      ? `${firstBullet}.`
      : `${product.productName}, 생각보다 훨씬 괜찮았어요.`
  );
  if (product.originalPrice > 0 && product.gongguPrice > 0 && discount > 0) {
    coreLines.push(
      `원래 ${formatKRW(product.originalPrice)}인데, 이번 공구에선 ${formatKRW(product.gongguPrice)}.`
    );
    coreLines.push(`${discount}% 할인이에요.`);
  } else if (product.gongguPrice > 0) {
    coreLines.push(`이번 공구가 ${formatKRW(product.gongguPrice)}.`);
  }
  const core = coreLines.join(" ");

  // CTA
  const cta = `프로필 링크로 가시면 돼요. ${endOrSoon(product.gongguEnd)} 마감!`;

  return { hook, core, cta };
}

// ─── 게시글 ───
function generatePost(
  product: ProductInput,
  context: GenerationContext
): PostOutput {
  const target = context.target?.trim() || "";
  const period = extractPeriod(context.experience) || "";
  const discount = discountRate(product.originalPrice, product.gongguPrice);
  const save = saveAmount(product.originalPrice, product.gongguPrice);
  const bullets = splitToBullets(context.experience, 3);
  const firstLine = context.experience.split(/[.。\n]/)[0]?.trim() || "";

  // Opening
  const opening = [
    `${product.productName}, 이번 공구 진짜 괜찮아요 ✨`,
    firstLine ? firstLine : `${period ? period + " " : ""}써본 솔직 후기 공유드려요.`,
  ].join("\n");

  // Body
  const bodyLines: string[] = [];
  bodyLines.push(`✨ 왜 이 제품이냐면요`);
  bodyLines.push(``);
  if (bullets.length > 0) {
    bullets.forEach((b) => bodyLines.push(`· ${b}`));
  } else {
    bodyLines.push(`· (체험 포인트를 입력하시면 이 부분에 장점이 정리돼요)`);
  }
  bodyLines.push(``);
  bodyLines.push(`💫 이번 공구 조건`);
  bodyLines.push(``);
  if (product.originalPrice > 0) {
    bodyLines.push(`· 정가 ${formatKRW(product.originalPrice)}`);
  }
  if (product.gongguPrice > 0) {
    bodyLines.push(
      `· 공구가 ${formatKRW(product.gongguPrice)}${discount > 0 ? ` (${discount}% 할인${save ? `, ${save} 절약` : ""})` : ""}`
    );
  }
  bodyLines.push(`· 기간 ${periodText(product.gongguStart, product.gongguEnd)}`);
  bodyLines.push(``);
  bodyLines.push(
    target
      ? `${target} 분들께 특히 추천드려요.`
      : `관심 있으시면 놓치지 마세요.`
  );
  bodyLines.push(`저장해두시면 나중에 다시 찾기 편해요 📌`);
  const body = bodyLines.join("\n");

  // CTA
  const cta = [
    `👉 프로필 링크에서 확인하실 수 있어요.`,
    `${endOrSoon(product.gongguEnd)} 마감이라 서두르셔야 해요!`,
  ].join("\n");

  // Hashtags
  const tags = [
    "#공구",
    "#공동구매",
    `#${shortProductName(product.productName)}`,
    "#공구추천",
    "#할인정보",
    "#리뷰",
    "#내돈내산후기",
    "#생활템",
    target ? `#${target.replace(/\s+/g, "")}` : "",
    "#공구스타그램",
  ].filter(Boolean);
  const hashtags = tags.join(" ");

  return { opening, body, hashtags, cta };
}

// ─── 진입점 ───
export function generateScriptLocal(
  product: ProductInput,
  context: GenerationContext,
  format: ScriptFormat
): LongformOutput | ShortsOutput | PostOutput {
  if (format === "longform") return generateLongform(product, context);
  if (format === "shorts") return generateShorts(product, context);
  return generatePost(product, context);
}
