import type { ForecastInput } from "./rules";

export const STORAGE_KEY = "work-forecast:input:v1";

export const EMPTY_INPUT: ForecastInput = {
  birthday: "",
  neighborhood: "",
  meetingDays: [],
  claudeUsage: 5,
  importantTask: "",
};

export function parseSavedInput(raw: string | null): ForecastInput {
  if (!raw) return EMPTY_INPUT;
  try {
    return { ...EMPTY_INPUT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_INPUT;
  }
}

export function saveInput(input: ForecastInput) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
}
