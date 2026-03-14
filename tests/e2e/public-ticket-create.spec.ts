import { test, expect } from "@playwright/test";

test("public user can submit a ticket and see the issued number", async ({ page }) => {
  await page.route("**/api/tickets", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ticketNumber: "CRN-20240314-TEST" }),
    });
  });

  await page.goto("/ticket/new");
  
  await page.getByLabel("이름").fill("김고객");
  await page.getByLabel("이메일").fill("customer@example.com");
  await page.getByLabel("제목").fill("테스트 티켓 제목입니다");
  await page.getByLabel("내용").fill("이것은 테스트 티켓 내용입니다. 충분한 길이의 설명을 작성합니다.");
  
  const categorySelect = page.getByLabel("카테고리");
  await categorySelect.selectOption({ index: 1 });
  
  await page.getByLabel("우선순위").selectOption({ label: "높음" });
  
  await page.getByRole("button", { name: "개발용 토큰 채우기" }).click();
  
  await page.getByRole("button", { name: "티켓 제출" }).click();
  
  await expect(page).toHaveURL(/\/ticket\/submitted\?id=CRN-/);
  
  await expect(page.getByText("문의가 접수되었습니다")).toBeVisible();
  await expect(page.getByText(/CRN-/)).toBeVisible();
});
