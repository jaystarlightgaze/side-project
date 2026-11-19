export const WEEKDAYS = [
  { id: "mon", label: "월" },
  { id: "tue", label: "화" },
  { id: "wed", label: "수" },
  { id: "thu", label: "목" },
  { id: "fri", label: "금" },
] as const;

export type WeekdayId = (typeof WEEKDAYS)[number]["id"];

export type ForecastInput = {
  /** YYYY-MM-DD */
  birthday: string;
  neighborhood: string;
  meetingDays: WeekdayId[];
  /** 0–10 */
  claudeUsage: number;
  importantTask: string;
};

export type CommuteWeather = {
  /** °C at 08:00 local time */
  temperature: number;
  /** max % between 07:00 and 09:00 local time */
  precipitationProbability: number;
  /** WMO weather code at 08:00 */
  weatherCode: number;
};

export type GradedItem = {
  grade: string;
  /** 0 good, 1 caution, 2 bad */
  level: 0 | 1 | 2;
  /** Facts the copywriter must stay consistent with. */
  facts: string;
};

export type GradedForecast = {
  baseLuck: number;
  items: {
    commute: GradedItem;
    pressure: GradedItem;
    meeting: GradedItem;
    overheat: GradedItem;
  };
  alert: string | null;
};

const LUCK_START = 75;
const LUCK_PENALTY = [0, 8, 16] as const;
const MAX_ADJUSTMENT = 10;

function gradeCommute(weather: CommuteWeather): GradedItem {
  const { temperature: t, precipitationProbability: p } = weather;
  const temp = `기온 ${t}°C`;
  const rain = `강수확률 ${p}%`;
  if (p >= 50) {
    return { grade: "출근길 비 소식", level: 2, facts: `비 올 가능성이 높음(${rain}), ${temp}` };
  }
  if (t <= 0) {
    return { grade: "출근길 한파주의", level: 2, facts: `영하의 추운 날씨(${temp}), 비 가능성 낮음(${rain})` };
  }
  if (t >= 28) {
    return { grade: "출근길 무더위", level: 1, facts: `더운 날씨(${temp}), 비 가능성 낮음(${rain})` };
  }
  if (p >= 30) {
    return { grade: "출근길 구름 많음", level: 1, facts: `비가 올 수도 있음(${rain}), ${temp}` };
  }
  if (t <= 7) {
    return { grade: "출근길 쌀쌀함", level: 1, facts: `쌀쌀한 날씨(${temp}), 비 가능성 낮음(${rain})` };
  }
  return { grade: "출근길 쾌청", level: 0, facts: `맑고 온화함(${temp}, ${rain})` };
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(...isoParts(fromIso));
  const to = Date.UTC(...isoParts(toIso));
  return Math.round((to - from) / 86_400_000);
}

function isoParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m - 1, d];
}

function gradePressure(birthday: string, today: string): GradedItem {
  const days = daysBetween(birthday, today);
  const cycle = (period: number) => Math.sin((2 * Math.PI * days) / period);
  const physical = cycle(23);
  const emotional = cycle(28);
  const intellectual = cycle(33);
  const sum = physical + emotional + intellectual;
  const facts = `바이오리듬 합계 ${sum.toFixed(2)} (신체 ${physical.toFixed(2)}, 감정 ${emotional.toFixed(2)}, 지성 ${intellectual.toFixed(2)})`;
  if (sum >= 1) return { grade: "고기압", level: 0, facts: `컨디션 좋음, ${facts}` };
  if (sum <= -1) return { grade: "저기압", level: 2, facts: `컨디션 가라앉음, ${facts}` };
  return { grade: "기압 보통", level: 1, facts: `컨디션 보통, ${facts}` };
}

function weekdayOf(today: string): WeekdayId | null {
  const day = new Date(Date.UTC(...isoParts(today))).getUTCDay();
  return WEEKDAYS[day - 1]?.id ?? null;
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "2026-11-19" → "목요일" */
export function koreanWeekday(iso: string): string {
  return `${KOREAN_WEEKDAYS[new Date(Date.UTC(...isoParts(iso))).getUTCDay()]}요일`;
}

function gradeMeeting(meetingDays: WeekdayId[], today: string): GradedItem {
  const weekday = weekdayOf(today);
  if (weekday && meetingDays.includes(weekday)) {
    return { grade: "회의 주의보", level: 2, facts: "오늘 회의 루틴이 있음" };
  }
  return { grade: "회의 없음", level: 0, facts: "오늘 회의 루틴이 없음" };
}

function gradeOverheat(usage: number): GradedItem {
  const facts = `어제 Claude 사용량 ${usage}/10`;
  if (usage >= 8) return { grade: "폭염주의보", level: 2, facts: `머리가 과열됨, ${facts}` };
  if (usage >= 4) return { grade: "더위 주의", level: 1, facts: `머리가 조금 달아오름, ${facts}` };
  return { grade: "쾌적", level: 0, facts: `머리가 식어 있음, ${facts}` };
}

/** Deterministic grades and base luck index. `today` is YYYY-MM-DD in Asia/Seoul. */
export function gradeForecast(input: ForecastInput, weather: CommuteWeather, today: string): GradedForecast {
  const items = {
    commute: gradeCommute(weather),
    pressure: gradePressure(input.birthday, today),
    meeting: gradeMeeting(input.meetingDays, today),
    overheat: gradeOverheat(input.claudeUsage),
  };
  const penalty = Object.values(items).reduce((sum, item) => sum + LUCK_PENALTY[item.level], 0);
  const alert = input.importantTask.trim();
  return {
    baseLuck: clamp(LUCK_START - penalty + (items.pressure.level === 0 ? 15 : 0), 0, 100),
    items,
    alert: alert === "" ? null : alert,
  };
}

/** The model may move the base luck by ±10; the result always stays an integer in 0–100. */
export function applyLuckAdjustment(baseLuck: number, adjustment: number): number {
  const safe = clamp(Number.isFinite(adjustment) ? adjustment : 0, -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
  return Math.round(clamp(baseLuck + safe, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
