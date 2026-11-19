import { expect, test } from "vitest";

import { daysBefore, pickRecallGrade, recallQuestion } from "./recall";

const item = (grade: string, level: 0 | 1 | 2) => ({ key: grade, title: grade, grade, level, facts: "", text: "" });

test("가장 나쁜 등급을 고르고, 같으면 앞 항목을 고른다 (AC7)", () => {
  expect(pickRecallGrade({ items: [item("쾌청", 0), item("회의 주의보", 2), item("폭염주의보", 2)] })).toBe("회의 주의보");
  expect(pickRecallGrade({ items: [item("쾌청", 0), item("고기압", 0)] })).toBe("쾌청");
});

test("먼저 묻는 질문은 지난 예보의 날짜와 등급을 담는다 (AC7)", () => {
  expect(recallQuestion("2026-11-18", "회의 주의보")).toBe("11월 18일 예보는 '회의 주의보'였는데, 실제로는 어떠셨어요?");
});

test("며칠 전 날짜를 월·연 경계를 넘어 계산한다", () => {
  expect(daysBefore("2026-11-19", 7)).toBe("2026-11-12");
  expect(daysBefore("2026-01-03", 7)).toBe("2025-12-27");
});
