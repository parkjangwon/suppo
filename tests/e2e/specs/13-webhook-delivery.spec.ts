import http from "node:http";

import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let server: http.Server;
let webhookUrl = "";
let createdTicketNumber: string | null = null;
let adminId = "";
const WEBHOOK_LISTEN_HOST = process.env.E2E_WEBHOOK_LISTEN_HOST ?? "127.0.0.1";
const WEBHOOK_PUBLIC_HOST = process.env.E2E_WEBHOOK_PUBLIC_HOST ?? "127.0.0.1";
const receivedPayloads: Array<{
  headers: http.IncomingHttpHeaders;
  body: Record<string, unknown>;
}> = [];

test.beforeAll(async () => {
  const admin = await seedAdmin();
  adminId = admin.id;
  await seedRequestType();

  server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      const bodyText = Buffer.concat(chunks).toString("utf8");
      receivedPayloads.push({
        headers: request.headers,
        body: JSON.parse(bodyText),
      });
      response.statusCode = 202;
      response.end("accepted");
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, WEBHOOK_LISTEN_HOST, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start webhook receiver");
  }

  webhookUrl = `http://${WEBHOOK_PUBLIC_HOST}:${address.port}/webhook`;

  await prisma.webhookEndpoint.create({
    data: {
      name: "E2E Outbound Webhook",
      url: webhookUrl,
      secret: "e2e-webhook-secret",
      events: ["ticket.created"],
      createdById: adminId,
    },
  });
});

test.afterAll(async () => {
  await prisma.webhookEndpoint.deleteMany({
    where: { name: "E2E Outbound Webhook" },
  });

  if (createdTicketNumber) {
    await cleanupTicket(createdTicketNumber);
  }

  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("관리자가 Webhook을 등록하면 티켓 생성 이벤트가 외부 서버로 전달된다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("연동 설정에서 등록된 Webhook 확인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/settings/integrations");
    await expect(page.getByText("E2E Outbound Webhook")).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "연동 설정 Webhook 확인");
  });

  await test.step("공개 티켓 폼으로 티켓 생성", async () => {
    await page.goto("http://127.0.0.1:3000/ticket/new");
    await page.locator("#customerName").fill("Webhook 고객");
    await page.locator("#customerEmail").fill("webhook-e2e@suppo-test.io");
    await page.locator("#subject").fill("[E2E] Webhook 티켓 생성");
    await page.locator("#description").fill("Webhook 전송 확인용 티켓입니다.");

    const typeSelect = page.locator("#requestTypeId");
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }

    await page.locator("#priority").selectOption("MEDIUM");
    await page.getByRole("button", { name: "티켓 제출" }).click();
    await expect(page).toHaveURL(/\/ticket\/submitted/, { timeout: 10000 });

    const url = page.url();
    const match = url.match(/id=(CRN-[^&]+)/);
    expect(match).not.toBeNull();
    createdTicketNumber = match![1];
    await captureStep(page, testInfo, "Webhook 대상 티켓 생성");
  });

  await test.step("외부 서버에서 Webhook 수신 확인", async () => {
    await expect.poll(() => receivedPayloads.length, { timeout: 10000 }).toBe(1);

    const payload = receivedPayloads[0];
    expect(payload.body.event).toBe("ticket.created");
    expect(payload.body.data).toMatchObject({
      source: "public-form",
      ticketNumber: createdTicketNumber,
    });
    expect(payload.headers["x-suppo-signature"]).toBeTruthy();
  });
});
