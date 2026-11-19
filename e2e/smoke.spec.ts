import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 직장 기상청 제목과 예보 보기 버튼이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("직장 기상청");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("직장 기상청");
  await expect(page.getByRole("button", { name: "예보 보기" })).toBeVisible();
});
