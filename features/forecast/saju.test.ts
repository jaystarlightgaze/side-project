import { describe, expect, test } from "vitest";

import { readSaju, sajuPressure } from "./saju";

describe("readSaju", () => {
  test("day pillar matches the known calendar (2000-01-01 is 무오, 1900-01-01 is 갑술)", () => {
    expect(readSaju("2000-01-01", "1900-01-01").dayMaster).toBe("무토");
    expect(readSaju("1990-05-05", "2000-01-01").todayPillar).toBe("무오");
    expect(readSaju("1990-05-05", "1900-01-01").todayPillar).toBe("갑술");
  });

  test("same birthday and date always give the same reading", () => {
    expect(readSaju("1990-05-05", "2026-11-19")).toEqual(readSaju("1990-05-05", "2026-11-19"));
  });

  test("lacking element is one not present in either day pillar, and good hours are within work hours", () => {
    const saju = readSaju("1990-05-05", "2026-11-19");
    expect(["목", "화", "토", "금", "수"]).toContain(saju.lacking);
    expect(saju.goodHours.length).toBeGreaterThan(0);
    for (const hour of saju.goodHours) expect(hour).toMatch(/^(오전|오후) \d{1,2}(시)?–/);
  });

  test("a day that clashes with the birthday's day branch is 저기압", () => {
    // 2000-01-01 is 무오; 6 days later the branch is 자 (子午충).
    const saju = readSaju("2000-01-01", "2000-01-07");
    expect(saju.clash).toBe(true);
    expect(sajuPressure(saju).grade).toBe("저기압");
  });

  test("the same day pillar as the birthday is 비화, so 고기압", () => {
    const saju = readSaju("2000-01-01", "2000-03-01");
    expect(saju.relation).toBe("비화");
    expect(sajuPressure(saju).grade).toBe("고기압");
  });
});
