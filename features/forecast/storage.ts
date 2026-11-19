import { LEAVE_TIMES, SLEEP_MAX, SLEEP_MIN, type ForecastInput } from "./rules";

export const STORAGE_KEY = "work-forecast:input:v1";

export const EMPTY_INPUT: ForecastInput = {
  birthday: "",
  neighborhood: "",
  meetingDays: [],
  leaveTime: "normal",
  sleepHours: 7,
  weeklyClaudeUsage: null,
  importantTask: "",
};

/**
 * 저장된 입력(브라우저, 계정)을 지금 형태로 맞춘다. 새 칸이 없거나 옛 `claudeUsage`가 남아 있어도
 * 오류 없이 기본값으로 채우고, 알 수 없는 칸은 버린다.
 */
export function normalizeInput(raw: unknown): ForecastInput {
  if (typeof raw !== "object" || raw === null) return EMPTY_INPUT;
  const r = raw as Record<string, unknown>;
  const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  const sleep = r.sleepHours;
  const usage = r.weeklyClaudeUsage;
  return {
    birthday: text(r.birthday, EMPTY_INPUT.birthday),
    neighborhood: text(r.neighborhood, EMPTY_INPUT.neighborhood),
    meetingDays: Array.isArray(r.meetingDays) ? (r.meetingDays as ForecastInput["meetingDays"]) : EMPTY_INPUT.meetingDays,
    leaveTime: LEAVE_TIMES.find((t) => t.id === r.leaveTime)?.id ?? EMPTY_INPUT.leaveTime,
    sleepHours:
      typeof sleep === "number" && Number.isFinite(sleep)
        ? Math.min(SLEEP_MAX, Math.max(SLEEP_MIN, Math.round(sleep)))
        : EMPTY_INPUT.sleepHours,
    weeklyClaudeUsage:
      typeof usage === "number" && Number.isFinite(usage) ? Math.min(100, Math.max(0, Math.round(usage))) : null,
    importantTask: text(r.importantTask, EMPTY_INPUT.importantTask),
  };
}

export function parseSavedInput(raw: string | null): ForecastInput {
  if (!raw) return EMPTY_INPUT;
  try {
    return normalizeInput(JSON.parse(raw));
  } catch {
    return EMPTY_INPUT;
  }
}

export function saveInput(input: ForecastInput) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
}
