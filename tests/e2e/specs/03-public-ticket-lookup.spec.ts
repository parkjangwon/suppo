// tests/e2e/specs/03-public-ticket-lookup.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const TEST_EMAIL = "e2e-lookup@suppo-test.io";
let ticketNumber: string;

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LOOKUP-${Date.now()}`,
      customerName: "조회 테스트 고객",
      customerEmail: TEST_EMAIL,
      subject: "[E2E] 조회 테스트 티켓",
      description: "조회 테스트용 티켓입니다.",
      priority: "MEDIUM",
      requestTypeId: rt.id,
    },
  });
  ticketNumber = ticket.ticketNumber;
});

test.afterAll(async () => {
  await cleanupTicket(ticketNumber);
  await prisma.$disconnect();
});

test("고객이 티켓 번호와 이메일로 티켓을 조회한다", async ({ page }, testInfo) => {
  await test.step("조회 폼 접근", async () => {
    await page.goto("/ticket/lookup");
    await expect(page.getByLabel("티켓 번호")).toBeVisible();
    await captureStep(page, testInfo, "조회 폼 접근");
  });

  await test.step("티켓 번호 및 이메일 입력", async () => {
    await page.getByLabel("티켓 번호").fill(ticketNumber);
    await page.getByLabel("이메일").fill(TEST_EMAIL);
    await captureStep(page, testInfo, "티켓 번호 및 이메일 입력");
  });

  await test.step("조회 후 상세 페이지 이동", async () => {
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page).toHaveURL(new RegExp(`/ticket/${ticketNumber}`), { timeout: 10000 });
    await captureStep(page, testInfo, "조회 후 상세 페이지 이동");
  });

  await test.step("티켓 정보 표시 확인", async () => {
    await expect(page.getByText(ticketNumber)).toBeVisible();
    await captureStep(page, testInfo, "티켓 정보 표시 확인");
  });
});
