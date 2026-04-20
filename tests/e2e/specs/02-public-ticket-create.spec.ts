// tests/e2e/specs/02-public-ticket-create.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let createdTicketNumber: string | null = null;

test.beforeAll(async () => {
  await seedAdmin();
  await seedRequestType();
});

test.afterEach(async () => {
  if (createdTicketNumber) {
    await cleanupTicket(createdTicketNumber);
    createdTicketNumber = null;
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("고객이 티켓을 생성하고 티켓 번호를 받는다", async ({ page }, testInfo) => {
  await test.step("티켓 생성 폼 접근", async () => {
    await page.goto("/ticket/new");
    await expect(page.locator("h1").first()).toBeVisible();
    await captureStep(page, testInfo, "티켓 생성 폼 접근");
  });

  await test.step("폼 입력", async () => {
    await page.getByLabel("이름").fill("테스트 고객");
    await page.getByLabel("이메일").fill("e2e-test@suppo-test.io");
    await page.getByLabel("제목").fill("[E2E] 테스트 티켓 제목");
    await page.getByLabel("내용").fill("E2E 자동화 테스트에서 생성된 티켓입니다. 자동으로 삭제됩니다.");

    const typeSelect = page.getByLabel("문의 유형");
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }

    await page.getByLabel("우선순위").selectOption("MEDIUM");
    await captureStep(page, testInfo, "폼 입력");
  });

  await test.step("티켓 제출", async () => {
    await page.getByRole("button", { name: "티켓 제출" }).click();
    await expect(page).toHaveURL(/\/ticket\/submitted/, { timeout: 10000 });
    await captureStep(page, testInfo, "티켓 제출");
  });

  await test.step("티켓 번호 확인", async () => {
    const url = page.url();
    const match = url.match(/id=(CRN-[^&]+)/);
    expect(match).not.toBeNull();
    createdTicketNumber = match![1];

    await expect(page.getByText(/문의가 접수되었습니다/)).toBeVisible();
    await expect(page.getByText(createdTicketNumber)).toBeVisible();
    await captureStep(page, testInfo, "티켓 번호 확인");
  });

  await test.step("DB 레코드 확인", async () => {
    expect(createdTicketNumber).not.toBeNull();
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: createdTicketNumber! },
    });
    expect(ticket).not.toBeNull();
    expect(ticket!.customerEmail).toBe("e2e-test@suppo-test.io");
  });
});
