import { readSaju, sajuPressure, type SajuToday } from "./saju";

export const WEEKDAYS = [
  { id: "mon", label: "월" },
  { id: "tue", label: "화" },
  { id: "wed", label: "수" },
  { id: "thu", label: "목" },
  { id: "fri", label: "금" },
] as const;

export type WeekdayId = (typeof WEEKDAYS)[number]["id"];

/** 어제 퇴근 시각 단계와 과열 점수. */
export const LEAVE_TIMES = [
  { id: "early", label: "칼퇴", when: "18시 전", score: 0 },
  { id: "normal", label: "보통", when: "20시 전", score: 1 },
  { id: "late", label: "야근", when: "22시 전", score: 2 },
  { id: "last", label: "막차", when: "22시 이후", score: 3 },
] as const;

export type LeaveTimeId = (typeof LEAVE_TIMES)[number]["id"];

export const SLEEP_MIN = 4;
export const SLEEP_MAX = 9;

export type ForecastInput = {
  /** YYYY-MM-DD */
  birthday: string;
  neighborhood: string;
  meetingDays: WeekdayId[];
  /** 어제 퇴근 시각 */
  leaveTime: LeaveTimeId;
  /** 어젯밤 수면 시간, 4–9 */
  sleepHours: number;
  /** 이번 주 Claude 사용량 0–100%. null이면 적지 않은 것이라 점수에 반영하지 않는다. */
  weeklyClaudeUsage: number | null;
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
  saju: SajuToday;
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

function isoParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m - 1, d];
}

function gradePressure(birthday: string, today: string): GradedItem {
  return sajuPressure(readSaju(birthday, today));
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

function sleepScore(hours: number): number {
  if (hours >= 7) return 0;
  if (hours >= 6) return 1;
  if (hours >= 5) return 2;
  return 3;
}

function usageScore(percent: number): number {
  if (percent >= 80) return 2;
  if (percent >= 40) return 1;
  return 0;
}

/** 세 입력의 점수 합(0–8)으로 정한다. 0–2 쾌적, 3–5 더위 주의, 6 이상 폭염주의보. */
function gradeOverheat({ leaveTime, sleepHours, weeklyClaudeUsage }: ForecastInput): GradedItem {
  const leave = LEAVE_TIMES.find((t) => t.id === leaveTime) ?? LEAVE_TIMES[1];
  const score =
    leave.score + sleepScore(sleepHours) + (weeklyClaudeUsage === null ? 0 : usageScore(weeklyClaudeUsage));
  const facts = [
    `어제 퇴근 ${leave.label}(${leave.when})`,
    `어젯밤 수면 ${sleepHours}시간`,
    weeklyClaudeUsage === null ? "이번 주 Claude 사용량은 적지 않음" : `이번 주 Claude 사용량 ${weeklyClaudeUsage}%`,
  ].join(", ");
  if (score >= 6) return { grade: "폭염주의보", level: 2, facts: `머리가 과열됨, ${facts}` };
  if (score >= 3) return { grade: "더위 주의", level: 1, facts: `머리가 조금 달아오름, ${facts}` };
  return { grade: "쾌적", level: 0, facts: `머리가 식어 있음, ${facts}` };
}

/** Deterministic grades and base luck index. `today` is YYYY-MM-DD in Asia/Seoul. */
export function gradeForecast(input: ForecastInput, weather: CommuteWeather, today: string): GradedForecast {
  const items = {
    commute: gradeCommute(weather),
    pressure: gradePressure(input.birthday, today),
    meeting: gradeMeeting(input.meetingDays, today),
    overheat: gradeOverheat(input),
  };
  const penalty = Object.values(items).reduce((sum, item) => sum + LUCK_PENALTY[item.level], 0);
  const alert = input.importantTask.trim();
  return {
    baseLuck: clamp(LUCK_START - penalty + (items.pressure.level === 0 ? 15 : 0), 0, 100),
    items,
    saju: readSaju(input.birthday, today),
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
