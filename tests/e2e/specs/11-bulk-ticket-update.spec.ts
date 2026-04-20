import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const TEST_TICKETS: { id: string; ticketNumber: string }[] = [];

test.beforeAll(async () => {
  await seedAdmin();
  const requestType = await seedRequestType();

  const ticketOne = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-BULK-1-${Date.now()}`,
      customerName: "벌크 고객 1",
      customerEmail: "bulk-1@suppo-test.io",
      subject: "[E2E] 벌크 작업 테스트 1",
      description: "벌크 작업 테스트용 티켓 1",
      priority: "MEDIUM",
      status: "OPEN",
      requestTypeId: requestType.id,
    },
  });

  const ticketTwo = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-BULK-2-${Date.now()}`,
      customerName: "벌크 고객 2",
      customerEmail: "bulk-2@suppo-test.io",
      subject: "[E2E] 벌크 작업 테스트 2",
      description: "벌크 작업 테스트용 티켓 2",
      priority: "MEDIUM",
      status: "OPEN",
      requestTypeId: requestType.id,
    },
  });

  TEST_TICKETS.push(
    { id: ticketOne.id, ticketNumber: ticketOne.ticketNumber },
    { id: ticketTwo.id, ticketNumber: ticketTwo.ticketNumber }
  );
});

test.afterAll(async () => {
  for (const ticket of TEST_TICKETS) {
    await cleanupTicket(ticket.ticketNumber);
  }
  await prisma.$disconnect();
});

test("관리자가 티켓 목록에서 여러 티켓을 선택해 상태를 일괄 변경한다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("티켓 목록에서 두 티켓 선택", async () => {
    await page.goto("http://127.0.0.1:3001/admin/tickets");

    await page.getByLabel(`select-ticket-${TEST_TICKETS[0].ticketNumber}`).click();
    await page.getByLabel(`select-ticket-${TEST_TICKETS[1].ticketNumber}`).click();

    await expect(page.getByText("2개 티켓 선택됨")).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "티켓 선택");
  });

  await test.step("벌크 상태 변경 적용", async () => {
    const bulkResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/tickets/bulk") &&
        response.request().method() === "POST",
      { timeout: 10000 }
    );

    await page.getByLabel("벌크 상태 변경").click();
    await page.getByRole("option", { name: "진행중" }).click();
    await page.getByRole("button", { name: "벌크 적용" }).click();

    const response = await bulkResponse;
    expect(response.ok()).toBeTruthy();
    await captureStep(page, testInfo, "벌크 상태 변경");
  });

  await test.step("DB에서 상태 변경 확인", async () => {
    const updated = await prisma.ticket.findMany({
      where: {
        id: { in: TEST_TICKETS.map((ticket) => ticket.id) },
      },
    });

    expect(updated).toHaveLength(2);
    expect(updated.every((ticket) => ticket.status === "IN_PROGRESS")).toBeTruthy();
  });
});
