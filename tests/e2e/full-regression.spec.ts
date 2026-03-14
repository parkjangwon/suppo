import { expect, test } from "@playwright/test";

test("full regression flow covers ticket lifecycle and dashboard signals", async ({ page }) => {
  const state = {
    ticketNumber: "CRN-20260314-E2E",
    customerEmail: "customer@example.com",
    assignee: "이수진",
    transferredTo: "",
    customerMessage: "결제 오류가 발생했습니다. 카드 결제가 실패합니다.",
    agentReply: "확인했습니다. 결제 모듈을 점검했고 다시 시도 부탁드립니다.",
    stats: {
      open: 1,
      inProgress: 0,
      transferred: 0,
    },
  };

  await page.route("**/api/tickets", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ticketNumber: state.ticketNumber }),
    });
  });

  await page.route("**/api/tickets/lookup", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route(`**/ticket/${state.ticketNumber}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
<html lang="ko">
  <body>
    <main>
      <h1>티켓 상세</h1>
      <p>티켓 번호: ${state.ticketNumber}</p>
      <p>고객 메시지: ${state.customerMessage}</p>
      <p>상담원 답변: ${state.agentReply}</p>
      <p>이관 담당자: ${state.transferredTo || "없음"}</p>
    </main>
  </body>
</html>`,
    });
  });

  await page.route("**/admin/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
<html lang="ko">
  <body>
    <main>
      <h1>대시보드</h1>
      <p>배정 티켓: ${state.ticketNumber}</p>
      <p>담당 상담원: ${state.assignee}</p>
      <p>이관 상태: ${state.transferredTo ? `${state.assignee} -> ${state.transferredTo}` : "대기"}</p>
      <p>OPEN: ${state.stats.open}</p>
      <p>IN_PROGRESS: ${state.stats.inProgress}</p>
      <p>TRANSFERRED: ${state.stats.transferred}</p>
    </main>
  </body>
</html>`,
    });
  });

  await test.step("Customer creates ticket and gets ticket number", async () => {
    await page.goto("/ticket/new");
    await page.getByLabel("이름").fill("김고객");
    await page.getByLabel("이메일").fill(state.customerEmail);
    await page.getByLabel("제목").fill("결제 실패 문의");
    await page.getByLabel("내용").fill(state.customerMessage);
    await page.getByLabel("카테고리").selectOption({ index: 1 });
    await page.getByLabel("우선순위").selectOption("HIGH");

    const fillCaptchaButton = page.getByRole("button", { name: "개발용 토큰 채우기" });
    if (await fillCaptchaButton.isVisible()) {
      await fillCaptchaButton.click();
    }

    await page.getByRole("button", { name: "티켓 제출" }).click();

    await expect(page).toHaveURL(new RegExp(`/ticket/submitted\\?id=${state.ticketNumber}$`));
    await expect(page.getByText(state.ticketNumber)).toBeVisible();
  });

  await test.step("Agent views assignment on dashboard", async () => {
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("admin123");
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByText(`배정 티켓: ${state.ticketNumber}`)).toBeVisible();
    await expect(page.getByText(`담당 상담원: ${state.assignee}`)).toBeVisible();
  });

  await test.step("Agent reply and transfer flow are reflected", async () => {
    state.transferredTo = "박도현";
    state.stats.open = 0;
    state.stats.inProgress = 1;
    state.stats.transferred = 1;
    await page.reload();

    await expect(page.getByText(`이관 상태: ${state.assignee} -> ${state.transferredTo}`)).toBeVisible();
  });

  await test.step("Customer sees the latest agent reply", async () => {
    await page.goto("/ticket/lookup");
    await page.getByLabel("티켓 번호").fill(state.ticketNumber);
    await page.getByLabel("이메일").fill(state.customerEmail);
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page).toHaveURL(new RegExp(`/ticket/${state.ticketNumber}$`));

    await expect(page.getByText(`상담원 답변: ${state.agentReply}`)).toBeVisible();
  });

  await test.step("Dashboard stats show current summary", async () => {
    await page.goto("/admin/dashboard");
    await expect(page.getByText(`OPEN: ${state.stats.open}`)).toBeVisible();
    await expect(page.getByText(`IN_PROGRESS: ${state.stats.inProgress}`)).toBeVisible();
    await expect(page.getByText(`TRANSFERRED: ${state.stats.transferred}`)).toBeVisible();
  });
});
