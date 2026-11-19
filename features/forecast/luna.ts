import { generateText, Output } from "ai";
import { z } from "zod";

import type { GradedForecast } from "./rules";

export const LUNA_MODEL = process.env.LUNA_MODEL ?? "openai/gpt-5.6-luna";

const lunaSchema = z.object({
  luckAdjustment: z.number().describe("기준 운 지수에 더할 정수 조정값, -10부터 10 사이"),
  headline: z.string().describe("오늘 예보 전체를 한 문장으로 요약한 기상청 말투 헤드라인"),
  commute: z.string().describe("출근길 날씨 예보 문구 1–2문장"),
  pressure: z.string().describe("개인 기압 예보 문구 1–2문장"),
  meeting: z.string().describe("회의 강수확률 예보 문구 1–2문장"),
  overheat: z.string().describe("과열 지수 예보 문구 1–2문장"),
  alertAdvice: z.string().nullable().describe("오늘의 특보에 대한 조언 1–2문장. 특보가 없으면 null"),
  tip: z.string().describe("오늘의 행동 요령 1개, 1–2문장"),
  askTiming: z.string().describe("부탁하기 좋은 타이밍 1개. 구체적인 시간대를 포함한 1–2문장"),
});

export type LunaCopy = z.infer<typeof lunaSchema>;

const STYLE_HINTS = [
  "뉴스 앵커처럼 차분하게",
  "현장 중계하는 기상캐스터처럼 생생하게",
  "새벽 라디오 날씨 코너처럼 다정하게",
  "긴급 속보처럼 진지하지만 유머 있게",
  "오래된 예보관의 노련한 한마디처럼",
];

const SYSTEM = `너는 '직장 기상청'의 예보관이다. 회사원에게 오늘의 직장 예보를 기상청 말투로 전한다.
규칙:
- 모든 문구는 한국어로 쓴다.
- 각 항목의 등급은 이미 정해져 있다. 등급을 바꾸거나 반대 의미로 쓰지 않는다.
- 출근길 날씨 문구는 주어진 기온과 강수확률 사실과 어긋나지 않게 쓴다(비 가능성이 낮으면 비 온다고 하지 않고, 추운 날을 덥다고 하지 않는다).
- 등급이 나빠도 행동 요령과 부탁 타이밍은 대안이나 다독임으로 끝낸다.
- 재미로 보는 예보다. 실제 예언이나 전문 상담인 척하지 않는다.
- 매번 새로운 표현을 쓴다.`;

export function buildPrompt(graded: GradedForecast, styleHint: string): string {
  const { items } = graded;
  return [
    `오늘의 말투: ${styleHint}`,
    `기준 운 지수: ${graded.baseLuck} (조정은 -10–10 정수)`,
    `출근길 날씨: 등급 "${items.commute.grade}", 사실: ${items.commute.facts}`,
    `개인 기압: 등급 "${items.pressure.grade}", 사실: ${items.pressure.facts}`,
    `회의 강수확률: 등급 "${items.meeting.grade}", 사실: ${items.meeting.facts}`,
    `과열 지수: 등급 "${items.overheat.grade}", 사실: ${items.overheat.facts}`,
    graded.alert ? `오늘의 특보(사용자가 적은 중요한 일): ${graded.alert}` : "오늘의 특보: 없음 (alertAdvice는 null)",
  ].join("\n");
}

export async function writeForecastCopy(graded: GradedForecast): Promise<LunaCopy> {
  const styleHint = STYLE_HINTS[Math.floor(Math.random() * STYLE_HINTS.length)];
  const { output } = await generateText({
    model: LUNA_MODEL,
    system: SYSTEM,
    prompt: buildPrompt(graded, styleHint),
    output: Output.object({ schema: lunaSchema }),
    abortSignal: AbortSignal.timeout(9000),
  });
  return output;
}
