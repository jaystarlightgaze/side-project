import { expect, test } from "@playwright/test";

test("처음 온 사람은 /에서 /setup으로 가고, 운수 좋은 출근길 헤더와 단계 표시, 예보 보기 버튼이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/setup$/);
  await expect(page).toHaveTitle("운수 좋은 출근길");
  await expect(page.getByRole("link", { name: "운수 좋은 출근길" })).toBeVisible();
  await expect(page.getByRole("list", { name: "단계" })).toContainText("① 명식 재료");
  await expect(page.getByRole("button", { name: "예보 보기" })).toBeVisible();
});

test("저장된 입력이 있으면 /에서 /today로 가고, 오늘 예보 받기 버튼만 있다", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "work-forecast:input:v1",
      JSON.stringify({ birthday: "1990-05-15", neighborhood: "seoul", meetingDays: [], leaveTime: "normal", sleepHours: 7, weeklyClaudeUsage: null, importantTask: "" }),
    );
  });
  await page.goto("/");

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("button", { name: "오늘 예보 받기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "명식 다시 세우기" })).toBeVisible();
});
