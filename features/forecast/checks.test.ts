import { describe, expect, test } from "vitest";

import { forecastSignature, parseSavedChecks, serializeChecks } from "./checks";

const forecast = { date: "2026-11-19", luck: 62, headline: "오늘은 흐림 뒤 맑음", tip: "회의 전에 물 한 잔", askTiming: "오후 3시 무렵" };

describe("할 일 체크 저장", () => {
  const sig = forecastSignature(forecast);

  test("같은 예보에서 저장한 체크를 그대로 되살린다", () => {
    expect(parseSavedChecks(serializeChecks(sig, [true, false, true]), sig)).toEqual([true, false, true]);
  });

  test("새 예보(문구가 다름)나 다른 날짜면 모두 풀린 상태다", () => {
    const saved = serializeChecks(sig, [true, true]);
    expect(parseSavedChecks(saved, forecastSignature({ ...forecast, headline: "다른 총평" }))).toEqual([]);
    expect(parseSavedChecks(saved, forecastSignature({ ...forecast, date: "2026-11-20" }))).toEqual([]);
  });

  test("저장값이 없거나 깨져 있으면 오류 없이 모두 풀린 상태다", () => {
    expect(parseSavedChecks(null, sig)).toEqual([]);
    expect(parseSavedChecks("{not json", sig)).toEqual([]);
    expect(parseSavedChecks(JSON.stringify({ signature: sig, checked: "x" }), sig)).toEqual([]);
    expect(parseSavedChecks(JSON.stringify({ signature: sig, checked: [1, "a", true] }), sig)).toEqual([false, false, true]);
    expect(parseSavedChecks("42", sig)).toEqual([]);
  });
});
