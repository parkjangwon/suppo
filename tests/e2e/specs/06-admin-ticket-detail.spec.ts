// tests/e2e/specs/06-admin-ticket-detail.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let ticketId: string;
let ticketNumber: string;

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-DETAIL-${Date.now()}`,
      customerName: "상세 테스트 고객",
      customerEmail: "e2e-detail@crinity-test.io",
      subject: "[E2E] 상세 페이지 테스트 티켓",
      description: "관리자 답변 및 상태 변경 테스트용 티켓입니다.",
      priority: "HIGH",
      status: "OPEN",
      requestTypeId: rt.id,
    },
  });
  ticketId = ticket.id;
  ticketNumber = ticket.ticketNumber;
});

test.afterAll(async () => {
  await cleanupTicket(ticketNumber);
  await prisma.$disconnect();
});

test("관리자가 티켓 상세에서 답변을 작성하고 상태를 변경한다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("wkddnjs1!");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("티켓 상세 페이지 접근", async () => {
    await page.goto(`/admin/tickets/${ticketId}`);
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "티켓 상세 페이지 접근");
  });

  await test.step("고객 답변 작성", async () => {
    await page.getByLabel("응답 작성").fill("[E2E] 자동화 테스트 답변입니다.");
    await captureStep(page, testInfo, "고객 답변 작성");
  });

  await test.step("답변 전송", async () => {
    await page.getByRole("button", { name: "전송" }).click();
    await expect(page.getByText("[E2E] 자동화 테스트 답변입니다.")).toBeVisible({ timeout: 5000 });
    await captureStep(page, testInfo, "답변 전송");
  });

  await test.step("내부 메모 작성 및 전송", async () => {
    await page.getByLabel("응답 작성").fill("[E2E] 내부 메모 내용입니다.");
    const internalCheck = page.getByLabel("내부 메모로 저장");
    if (await internalCheck.isVisible()) {
      await internalCheck.check();
    }
    await page.getByRole("button", { name: "전송" }).click();
    await captureStep(page, testInfo, "내부 메모 작성 및 전송");
  });

  await test.step("상태 변경 (OPEN → IN_PROGRESS)", async () => {
    const statusSelect = page.getByLabel("상태");
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption("IN_PROGRESS");
    } else {
      await page.getByRole("button", { name: /상태 변경|IN_PROGRESS|진행중/i }).first().click();
    }
    await page.waitForTimeout(500);
    await captureStep(page, testInfo, "상태 변경");
  });

  await test.step("DB에서 상태 변경 확인", async () => {
    const updated = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(updated!.status).toBe("IN_PROGRESS");
  });
});
