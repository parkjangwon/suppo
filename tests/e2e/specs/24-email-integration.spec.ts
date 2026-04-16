import { expect, test } from "@playwright/test";

import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const TEST_NOTIFICATION_EMAIL = "qa-email-e2e@crinity-test.io";
let createdTicketNumber: string | null = null;
let createdTicketId: string | null = null;
let requestTypeId: string;
let ticketCreatedAt: Date | null = null;

async function seedEmailSettings(overrides: Record<string, unknown>) {
  await prisma.emailSettings.upsert({
    where: { id: "default" },
    update: {
      provider: "nodemailer",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "no-reply@crinity-test.io",
      fromName: "Crinity Helpdesk E2E",
      sesAccessKey: null,
      sesSecretKey: null,
      sesRegion: "ap-northeast-2",
      resendApiKey: null,
      customerEmailsEnabled: false,
      internalNotificationsEnabled: false,
      notifyOnNewTicket: true,
      notifyOnAssign: true,
      notifyOnComment: true,
      notifyOnStatusChange: true,
      notifyOnSlaWarning: true,
      notifyOnSlaBreach: true,
      notifyCustomerOnTicketCreated: false,
      notifyCustomerOnAgentReply: false,
      notifyCustomerOnStatusChange: false,
      notifyCustomerOnCsatSurvey: false,
      notificationEmail: TEST_NOTIFICATION_EMAIL,
      testMode: false,
      ...overrides,
    },
    create: {
      id: "default",
      provider: "nodemailer",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "no-reply@crinity-test.io",
      fromName: "Crinity Helpdesk E2E",
      sesAccessKey: null,
      sesSecretKey: null,
      sesRegion: "ap-northeast-2",
      resendApiKey: null,
      customerEmailsEnabled: false,
      internalNotificationsEnabled: false,
      notifyOnNewTicket: true,
      notifyOnAssign: true,
      notifyOnComment: true,
      notifyOnStatusChange: true,
      notifyOnSlaWarning: true,
      notifyOnSlaBreach: true,
      notifyCustomerOnTicketCreated: false,
      notifyCustomerOnAgentReply: false,
      notifyCustomerOnStatusChange: false,
      notifyCustomerOnCsatSurvey: false,
      notificationEmail: TEST_NOTIFICATION_EMAIL,
      testMode: false,
      ...overrides,
    },
  });
}

async function loginAdmin(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("http://127.0.0.1:3001/admin/login");
  await page.getByLabel("이메일").fill("admin@crinity.io");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
}

test.beforeAll(async () => {
  await seedAdmin();
  const requestType = await seedRequestType();
  requestTypeId = requestType.id;
});

test.afterEach(async () => {
  await prisma.emailDelivery.deleteMany({
    where: {
      OR: [
        { to: TEST_NOTIFICATION_EMAIL },
        { ticketId: createdTicketId ?? undefined },
      ],
    },
  });

  if (createdTicketNumber) {
    await cleanupTicket(createdTicketNumber);
    createdTicketNumber = null;
    createdTicketId = null;
    ticketCreatedAt = null;
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("관리자가 이메일 설정 화면에서 테스트 메일을 보낼 수 있다", async ({ page }, testInfo) => {
  await seedEmailSettings({
    testMode: true,
    internalNotificationsEnabled: true,
  });

  await test.step("관리자 로그인", async () => {
    await loginAdmin(page);
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("이메일 설정 페이지 접근", async () => {
    await page.goto("http://127.0.0.1:3001/admin/settings/email");
    await expect(page.getByText("이메일 서버 설정")).toBeVisible();
    await expect(page.getByText("내부 알림 설정")).toBeVisible();
    await expect(page.getByText("고객 이메일 설정")).toBeVisible();
    await captureStep(page, testInfo, "이메일 설정 페이지 접근");
  });

  await test.step("테스트 메일 발송", async () => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/settings/email/test") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "테스트 메일 보내기" }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    await captureStep(page, testInfo, "테스트 메일 발송");
  });

  await test.step("DB에 테스트 메일 기록이 남는다", async () => {
    await expect
      .poll(async () => {
        return prisma.emailDelivery.findFirst({
          where: {
            to: TEST_NOTIFICATION_EMAIL,
            category: "INTERNAL",
          },
          orderBy: { createdAt: "desc" },
        });
      })
      .toMatchObject({
        to: TEST_NOTIFICATION_EMAIL,
        category: "INTERNAL",
        status: "SENT",
      });
  });
});

test("고객이 티켓을 생성하면 고객/내부 이메일이 outbox에 적재된다", async ({ page }, testInfo) => {
  await seedEmailSettings({
    customerEmailsEnabled: true,
    internalNotificationsEnabled: true,
    notifyCustomerOnTicketCreated: true,
    notifyOnNewTicket: true,
    testMode: false,
  });

  await test.step("티켓 생성 폼 접근", async () => {
    await page.goto("http://127.0.0.1:3000/ticket/new");
    await expect(page.locator("h1").first()).toBeVisible();
    await captureStep(page, testInfo, "티켓 생성 폼 접근");
  });

  await test.step("티켓 작성 및 제출", async () => {
    await page.getByLabel("이름").fill("이메일 E2E 고객");
    await page.getByLabel("이메일").fill("email-e2e@crinity-test.io");
    await page.getByLabel("제목").fill("[E2E] 이메일 연동 티켓");
    await page.getByLabel("내용").fill("이메일 연동 E2E 검증용 티켓입니다. 자동 생성 후 정리됩니다.");
    await page.getByLabel("문의 유형").selectOption(requestTypeId);
    await page.getByLabel("우선순위").selectOption("MEDIUM");
    await page.getByRole("button", { name: "티켓 제출" }).click();
    await expect(page).toHaveURL(/\/ticket\/submitted/, { timeout: 10000 });
    await captureStep(page, testInfo, "티켓 제출");
  });

  await test.step("티켓 번호 및 DB 레코드 확인", async () => {
    const url = page.url();
    const match = url.match(/id=(CRN-[^&]+)/);
    expect(match).not.toBeNull();
    createdTicketNumber = match![1];

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: createdTicketNumber! },
    });
    expect(ticket).not.toBeNull();
    createdTicketId = ticket!.id;
    ticketCreatedAt = ticket!.createdAt;
  });

  await test.step("고객/내부 이메일이 outbox에 적재된다", async () => {
    await expect
      .poll(async () => {
        return prisma.emailDelivery.findMany({
          where: {
            OR: [
              { ticketId: createdTicketId! },
              {
                to: TEST_NOTIFICATION_EMAIL,
                createdAt: { gte: ticketCreatedAt! },
              },
            ],
          },
          orderBy: { createdAt: "asc" },
          select: {
            to: true,
            category: true,
            status: true,
          },
        });
      })
      .toEqual([
        {
          to: "email-e2e@crinity-test.io",
          category: "CUSTOMER",
          status: "PENDING",
        },
        {
          to: TEST_NOTIFICATION_EMAIL,
          category: "INTERNAL",
          status: "PENDING",
        },
      ]);
  });
});
