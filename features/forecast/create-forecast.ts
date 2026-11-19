import { z } from "zod";

import { writeForecastCopy } from "./forecast-copy";
import { applyLuckAdjustment, gradeForecast, type CommuteWeather, type GradedItem } from "./rules";
import { fetchCommuteWeather, findNeighborhood } from "./weather";

export const forecastInputSchema = z.object({
  birthday: z.iso.date(),
  neighborhood: z.string().refine((id) => findNeighborhood(id) !== undefined),
  meetingDays: z.array(z.enum(["mon", "tue", "wed", "thu", "fri"])),
  claudeUsage: z.number().int().min(0).max(10),
  importantTask: z.string().max(100),
});

export type ForecastItem = GradedItem & { key: string; title: string; text: string };

export type ForecastResult = {
  date: string;
  neighborhood: string;
  weather: CommuteWeather;
  luck: number;
  headline: string;
  items: ForecastItem[];
  alert: { task: string; advice: string } | null;
  tip: string;
  askTiming: string;
};

export function todayInSeoul(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

export async function createForecast(input: z.infer<typeof forecastInputSchema>): Promise<ForecastResult> {
  const neighborhood = findNeighborhood(input.neighborhood)!;
  const today = todayInSeoul();
  const weather = await fetchCommuteWeather(neighborhood);
  const graded = gradeForecast(input, weather, today);
  const copy = await writeForecastCopy(graded);

  return {
    date: today,
    neighborhood: neighborhood.label,
    weather,
    luck: applyLuckAdjustment(graded.baseLuck, copy.luckAdjustment),
    headline: copy.headline,
    items: [
      { key: "commute", title: "출근길 날씨", ...graded.items.commute, text: copy.commute },
      { key: "pressure", title: "개인 기압", ...graded.items.pressure, text: copy.pressure },
      { key: "meeting", title: "회의 강수확률", ...graded.items.meeting, text: copy.meeting },
      { key: "overheat", title: "과열 지수", ...graded.items.overheat, text: copy.overheat },
    ],
    alert: graded.alert ? { task: graded.alert, advice: copy.alertAdvice ?? "" } : null,
    tip: copy.tip,
    askTiming: copy.askTiming,
  };
}
