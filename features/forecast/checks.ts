import type { ForecastResult } from "./create-forecast";

export const CHECKS_KEY = "work-forecast:checks:v1";

/** 같은 예보인지 가르는 값: 예보 날짜와 예보 자체(운 지수, 총평, 처신, 타이밍). */
export function forecastSignature(forecast: Pick<ForecastResult, "date" | "luck" | "headline" | "tip" | "askTiming">): string {
  return [forecast.date, forecast.luck, forecast.headline, forecast.tip, forecast.askTiming].join("|");
}

export function serializeChecks(signature: string, checked: boolean[]): string {
  return JSON.stringify({ signature, checked });
}

/** 저장값이 이 예보의 것일 때만 되살린다. 없거나 깨졌거나 다른 예보면 모두 풀린 상태([])다. */
export function parseSavedChecks(raw: string | null, signature: string): boolean[] {
  if (!raw) return [];
  try {
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) return [];
    const { signature: savedSignature, checked } = saved as { signature?: unknown; checked?: unknown };
    if (savedSignature !== signature || !Array.isArray(checked)) return [];
    return checked.map((value) => value === true);
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

export function subscribeChecks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readChecksRaw(): string | null {
  return localStorage.getItem(CHECKS_KEY);
}

export function saveChecks(signature: string, checked: boolean[]) {
  localStorage.setItem(CHECKS_KEY, serializeChecks(signature, checked));
  listeners.forEach((listener) => listener());
}

export function clearChecks() {
  localStorage.removeItem(CHECKS_KEY);
  listeners.forEach((listener) => listener());
}
