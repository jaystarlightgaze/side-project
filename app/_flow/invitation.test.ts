import { expect, test } from "vitest";

import { chatInvitation } from "./invitation";

const calm = { alert: null, luck: 50 };

test("권유 조건이 없으면 권유하지 않는다 (AC6)", () => {
  expect(chatInvitation(calm, false)).toBeNull();
  expect(chatInvitation({ alert: null, luck: 31 }, false)).toBeNull();
  expect(chatInvitation({ alert: null, luck: 79 }, false)).toBeNull();
});

test("특보가 있으면 특보 문구로 권유한다 (AC6)", () => {
  expect(chatInvitation({ alert: { task: "휴가 결재", advice: "" }, luck: 50 }, false)).toBe(
    "오늘은 특보가 걸렸어요. 예보관과 얘기해 보세요",
  );
});

test("운 지수가 30 이하이거나 80 이상이면 권유한다 (AC6)", () => {
  expect(chatInvitation({ alert: null, luck: 30 }, false)).toMatch(/예보관과 얘기해 보세요$/);
  expect(chatInvitation({ alert: null, luck: 80 }, false)).toMatch(/예보관과 얘기해 보세요$/);
});

test("답하지 않은 먼저 묻는 질문이 있으면 그 문구가 가장 앞선다 (AC7)", () => {
  expect(chatInvitation(calm, true)).toBe("예보관이 어제 일을 묻고 있어요");
  expect(chatInvitation({ alert: { task: "발표", advice: "" }, luck: 10 }, true)).toBe("예보관이 어제 일을 묻고 있어요");
});
