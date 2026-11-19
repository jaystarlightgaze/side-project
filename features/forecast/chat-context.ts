import type { ForecastResult } from "./create-forecast";
import { koreanWeekday } from "./rules";

/** "2026-11-18" → "11월 18일" */
export function formatKoreanDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/** Plain-text summary of today's forecast that the forecaster keeps in mind while chatting. */
export function describeForecastForChat(forecast: ForecastResult): string {
  return [
    `발표일: ${forecast.date} ${koreanWeekday(forecast.date)}, 동네: ${forecast.neighborhood}`,
    `출근길 실제 날씨: 8시 기온 ${forecast.weather.temperature}°C, 7–9시 강수확률 ${forecast.weather.precipitationProbability}%`,
    `오늘의 운 지수: ${forecast.luck}/100`,
    `헤드라인: ${forecast.headline}`,
    ...forecast.items.map((item) => `${item.title}: 등급 "${item.grade}" — ${item.text}`),
    forecast.alert ? `오늘의 특보(사용자가 적은 중요한 일): ${forecast.alert.task} — ${forecast.alert.advice}` : "오늘의 특보: 없음",
    `행동 요령: ${forecast.tip}`,
    `부탁하기 좋은 타이밍: ${forecast.askTiming}`,
    forecast.memory
      ? `지난 기억: ${formatKoreanDate(forecast.memory.date)} '${forecast.memory.grade}' 예보에 대해 사용자가 털어놓은 실제 결과: "${forecast.memory.answer}"`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
