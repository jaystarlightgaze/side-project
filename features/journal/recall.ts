import { formatKoreanDate, type ForecastResult } from "@/features/forecast/server";

export const MEMORY_WINDOW_DAYS = 7;

/** The forecast item the forecaster asks about: the worst graded one, first on ties. */
export function pickRecallGrade(result: Pick<ForecastResult, "items">): string {
  const worst = result.items.reduce((best, item) => (item.level > best.level ? item : best), result.items[0]);
  return worst.grade;
}

/** Fixed opening question built from the stored past forecast, never invented by the model. */
export function recallQuestion(date: string, grade: string): string {
  return `${formatKoreanDate(date)} 예보는 '${grade}'였는데, 실제로는 어떠셨어요?`;
}

/** YYYY-MM-DD that is `days` before `today`. */
export function daysBefore(today: string, days: number): string {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}
