import { generateText, Output } from "ai";
import { z } from "zod";

import { DEFAULT_MODEL } from "@/lib/ai-model";

import type { ForecastMemory } from "./create-forecast";
import { koreanWeekday, type GradedForecast } from "./rules";

export const FORECAST_MODEL = process.env.FORECAST_MODEL ?? DEFAULT_MODEL;

const copySchema = z.object({
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

export type ForecastCopy = z.infer<typeof copySchema>;

const STYLE_HINTS = [
  "뉴스 앵커처럼 차분하게",
  "현장 중계하는 기상캐스터처럼 생생하게",
  "새벽 라디오 날씨 코너처럼 다정하게",
  "긴급 속보처럼 진지하지만 유머 있게",
  "오래된 예보관의 노련한 한마디처럼",
  "옆자리 동료가 메신저로 귀띔하듯 짧게",
  "항공 기상 브리핑처럼 또박또박",
  "바다 날씨 예보처럼 물결과 바람에 빗대어",
];

/** Weather images to steer the copy away from repeating the same metaphors every day. */
const IMAGERY = ["전선", "기압골", "안개", "소나기", "무지개", "황사", "편서풍", "태풍의 눈", "건조주의보", "첫눈", "일교차", "체감온도"];

const SYSTEM = `너는 '직장 기상청'의 예보관이다. 출근 전 회사원에게 오늘의 직장 예보를 기상청 말투로 전한다. 30초 안에 읽히게 짧고 가볍게 쓴다.
규칙:
- 모든 문구는 한국어 존댓말로 쓴다. 말투가 달라져도 반말은 쓰지 않는다.
- 날짜와 요일은 '오늘' 줄에 적힌 것만 쓴다. 다른 요일이나 날짜를 지어내지 않는다.
- 각 항목의 등급은 이미 정해져 있다. 등급을 바꾸거나 반대 의미로 쓰지 않는다.
- 출근길 날씨 문구는 주어진 기온과 강수확률 사실과 어긋나지 않게 쓴다(비 가능성이 낮으면 비 온다고 하지 않고, 추운 날을 덥다고 하지 않는다).
- 일반 운세 말투("좋은 기운", "차분한 마음으로", "긍정적인 에너지")를 쓰지 않는다. 대신 회의, 보고, 메신저, 점심, 결재, 특보에 적힌 일처럼 회사에서 실제로 겪는 장면을 짚는다.
- 기상청 은유(전선, 기압, 강수확률, 주의보, 특보)를 일관되게 쓴다.
- 오늘의 특보가 있으면 alertAdvice와 부탁 타이밍이 그 일과 시간에 맞물리게 쓴다(특보에 시간이 적혀 있으면 그 시간과 어긋나는 타이밍을 권하지 않는다).
- 등급이 나빠도 행동 요령과 부탁 타이밍은 대안이나 다독임으로 끝낸다.
- 재미로 보는 예보다. 실제 예언이나 전문 상담인 척하지 않는다.
- 매번 새로운 표현을 쓴다. 헤드라인을 "오늘은", "차분한"처럼 뻔한 말로 시작하지 않는다.`;

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function buildPrompt(
  graded: GradedForecast,
  today: string,
  styleHint: string,
  imagery: string,
  memory: ForecastMemory | null = null,
): string {
  const { items } = graded;
  return [
    `오늘: ${today} ${koreanWeekday(today)}`,
    `오늘의 말투: ${styleHint}`,
    `오늘 헤드라인에 살짝 쓸 날씨 비유 소재: ${imagery}`,
    `기준 운 지수: ${graded.baseLuck} (조정은 -10–10 정수)`,
    `출근길 날씨: 등급 "${items.commute.grade}", 사실: ${items.commute.facts}`,
    `개인 기압: 등급 "${items.pressure.grade}", 사실: ${items.pressure.facts}`,
    `회의 강수확률: 등급 "${items.meeting.grade}", 사실: ${items.meeting.facts}`,
    `과열 지수: 등급 "${items.overheat.grade}", 사실: ${items.overheat.facts}`,
    graded.alert ? `오늘의 특보(사용자가 적은 중요한 일): ${graded.alert}` : "오늘의 특보: 없음 (alertAdvice는 null)",
    memory
      ? `지난 기억: ${memory.date} '${memory.grade}' 예보에 대해 사용자가 털어놓은 실제 결과는 "${memory.answer}". 헤드라인이나 행동 요령에서 이 일을 자연스럽게 이어 언급해도 된다.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeForecastCopy(
  graded: GradedForecast,
  today: string,
  memory: ForecastMemory | null = null,
): Promise<ForecastCopy> {
  const { output } = await generateText({
    model: FORECAST_MODEL,
    system: SYSTEM,
    prompt: buildPrompt(graded, today, pick(STYLE_HINTS), pick(IMAGERY), memory),
    output: Output.object({ schema: copySchema }),
    abortSignal: AbortSignal.timeout(9000),
  });
  return output;
}
