import { describe, expect, test } from "vitest";

import { EMPTY_INPUT, normalizeInput, parseSavedInput } from "./storage";

describe("저장된 입력 호환", () => {
  const old = { birthday: "1990-05-15", neighborhood: "seoul", meetingDays: ["thu"], claudeUsage: 9, importantTask: "결재" };

  test("옛 입력(claudeUsage)은 오류 없이 새 칸을 기본값으로 채운다", () => {
    const result = parseSavedInput(JSON.stringify(old));
    expect(result).toEqual({
      birthday: "1990-05-15",
      neighborhood: "seoul",
      meetingDays: ["thu"],
      leaveTime: "normal",
      sleepHours: 7,
      weeklyClaudeUsage: null,
      importantTask: "결재",
    });
    expect(result).not.toHaveProperty("claudeUsage");
  });

  test("새 입력은 그대로 읽는다", () => {
    const next = { ...old, leaveTime: "last", sleepHours: 5, weeklyClaudeUsage: 60 };
    expect(normalizeInput(next)).toMatchObject({ leaveTime: "last", sleepHours: 5, weeklyClaudeUsage: 60 });
  });

  test("엉뚱한 값은 기본값이나 범위 안으로 맞춘다", () => {
    expect(normalizeInput({ leaveTime: "x", sleepHours: "a", weeklyClaudeUsage: 250 })).toMatchObject({
      leaveTime: "normal",
      sleepHours: 7,
      weeklyClaudeUsage: 100,
    });
    expect(normalizeInput({ sleepHours: 2 }).sleepHours).toBe(4);
  });

  test("깨진 저장값이나 비어 있는 값은 빈 입력", () => {
    expect(parseSavedInput("{oops")).toEqual(EMPTY_INPUT);
    expect(parseSavedInput(null)).toEqual(EMPTY_INPUT);
    expect(normalizeInput(null)).toEqual(EMPTY_INPUT);
  });
});
