import type { ForecastResult } from "@/features/forecast";

/**
 * The one line that invites the user into the chat on weighty days, or null on an ordinary day.
 * recallOpen: the forecaster's question about the last forecast is still unanswered today.
 */
export function chatInvitation(forecast: Pick<ForecastResult, "alert" | "luck">, recallOpen: boolean): string | null {
  if (recallOpen) return "예보관이 어제 일을 묻고 있어요";
  if (forecast.alert) return "오늘은 특보가 걸렸어요. 예보관과 얘기해 보세요";
  if (forecast.luck <= 30) return "오늘은 기압이 낮아요. 예보관과 얘기해 보세요";
  if (forecast.luck >= 80) return "오늘은 운이 활짝 갰어요. 예보관과 얘기해 보세요";
  return null;
}
