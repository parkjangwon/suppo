import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let createdTicketId: string | null = null;
let createdTicketNumber: string | null = null;

test.beforeAll(async () => {
  await seedAdmin();
  await seedRequestType();
});

test.afterAll(async () => {
  if (createdTicketNumber) {
    await cleanupTicket(createdTicketNumber);
  }

  await prisma.publicApiKey.deleteMany({
    where: {
      name: "E2E Public API Key",
    },
  });

  await prisma.$disconnect();
});

test("관리자가 API 키를 발급하고 공개 티켓 API로 생성/수정한다", async ({ page }, testInfo) => {
  let plaintextApiKey = "";

  await test.step("관리자 로그인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("연동 설정에서 공개 API 키 발급", async () => {
    await page.goto("http://127.0.0.1:3001/admin/settings/integrations");
    await page.getByRole("button", { name: "API 키 발급" }).click();
    await page.getByLabel("키 이름").fill("E2E Public API Key");
    await page.getByLabel("new-api-key-scope-tickets:update").click();
    await page.getByRole("button", { name: "발급" }).click();

    const issuedKey = page.getByLabel("issued-api-key");
    await expect(issuedKey).toBeVisible({ timeout: 10000 });
    plaintextApiKey = (await issuedKey.textContent())?.trim() ?? "";
    expect(plaintextApiKey).toContain("crn_live_");
    await captureStep(page, testInfo, "연동 설정 공개 API 키 발급");
  });

  await test.step("공개 API로 티켓 생성", async () => {
    const requestType = await prisma.requestType.findFirstOrThrow({
      where: { isActive: true },
    });

    const response = await page.request.post("http://127.0.0.1:3001/api/public/tickets", {
      headers: {
        "content-type": "application/json",
        "x-api-key": plaintextApiKey,
      },
      data: {
        customerName: "공개 API 고객",
        customerEmail: "public-api-e2e@suppo-test.io",
        requestTypeId: requestType.id,
        priority: "MEDIUM",
        subject: "[E2E] 공개 API 생성",
        description: "공개 API를 통한 티켓 생성 테스트",
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    createdTicketId = data.id;
    createdTicketNumber = data.ticketNumber;
    expect(createdTicketNumber).toContain("CRN-");
  });

  await test.step("공개 API로 티켓 상태 변경", async () => {
    expect(createdTicketId).not.toBeNull();

    const response = await page.request.patch(`http://127.0.0.1:3001/api/public/tickets/${createdTicketId}`, {
      headers: {
        "content-type": "application/json",
        "x-api-key": plaintextApiKey,
      },
      data: {
        status: "IN_PROGRESS",
      },
    });

    expect(response.ok()).toBeTruthy();
    await captureStep(page, testInfo, "공개 API 상태 변경");
  });

  await test.step("DB에서 반영 확인", async () => {
    expect(createdTicketId).not.toBeNull();
    const ticket = await prisma.ticket.findUnique({
      where: { id: createdTicketId! },
    });

    expect(ticket).not.toBeNull();
    expect(ticket?.status).toBe("IN_PROGRESS");
  });
});
