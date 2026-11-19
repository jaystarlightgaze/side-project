import { expect, test } from "@playwright/test";

test("처음 온 사람은 /에서 /setup으로 가고, 직장 기상청 헤더와 단계 표시, 예보 보기 버튼이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/setup$/);
  await expect(page).toHaveTitle("직장 기상청");
  await expect(page.getByRole("link", { name: "직장 기상청" })).toBeVisible();
  await expect(page.getByRole("list", { name: "단계" })).toContainText("① 명식 재료");
  await expect(page.getByRole("button", { name: "예보 보기" })).toBeVisible();
});

test("저장된 입력이 있으면 /에서 /today로 가고, 오늘 예보 받기 버튼만 있다", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "work-forecast:input:v1",
      JSON.stringify({ birthday: "1990-05-15", neighborhood: "seoul", meetingDays: [], claudeUsage: 5, importantTask: "" }),
    );
  });
  await page.goto("/");

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("button", { name: "오늘 예보 받기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "명식 다시 세우기" })).toBeVisible();
});
