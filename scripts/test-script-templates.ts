import { generateScriptLocal } from "../lib/scriptTemplates";
import type { ScriptFormat } from "../lib/prompts/scriptGeneration";

const product = {
  productName: "프리미엄 비타민C 세럼 30ml",
  originalPrice: 50000,
  gongguPrice: 29000,
  gongguStart: "2026-04-25",
  gongguEnd: "2026-04-30",
};

const cases = [
  {
    label: "뷰티 / 친근 톤 / 30대 워킹맘",
    context: {
      experience:
        "3개월 써봤는데 피부 속당김이 확실히 줄었고, 아침에 붓기가 덜해요. 발림성도 기존보다 훨씬 가벼워요",
      target: "30대 워킹맘",
      tone: "친근",
    },
  },
  {
    label: "건강식품 / 전문 톤 / 40대 남성 (체험 짧은 케이스)",
    context: {
      experience: "한 달 먹어보니 오후에 덜 피곤해졌어요",
      target: "40대 남성",
      tone: "전문",
    },
  },
  {
    label: "체험 포인트 비어있음 (에러 케이스 방어)",
    context: {
      experience: "",
      target: "",
      tone: "친근",
    },
  },
];

const formats: ScriptFormat[] = ["longform", "shorts", "post"];

function line(label: string) {
  console.log("\n" + "─".repeat(70));
  console.log(label);
  console.log("─".repeat(70));
}

for (const c of cases) {
  console.log("\n\n████████ CASE: " + c.label + " ████████");
  for (const fmt of formats) {
    line(`[${fmt.toUpperCase()}]`);
    const out = generateScriptLocal(product, c.context, fmt) as unknown as Record<
      string,
      string
    >;
    for (const [key, val] of Object.entries(out)) {
      console.log(`\n▸ ${key}`);
      console.log(val);
    }
  }
}
