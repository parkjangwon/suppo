import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@crinity/db", () => {
  const emailSettings = {
    findUnique: vi.fn(),
  };
  const emailThreadMapping = {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  };

  return {
    prisma: {
      emailDelivery: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      emailSettings,
      emailThreadMapping,
    },
  };
});

import { prisma } from "@crinity/db";
import { enqueueEmail } from "@crinity/shared/email/enqueue";
import { processOutbox } from "@crinity/shared/email/process-outbox";

function createDbMock() {
  return {
    emailDelivery: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("email outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.emailSettings.findUnique).mockResolvedValue({
      id: "default",
      provider: "nodemailer",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "mailer@example.com",
      smtpPassword: "secret",
      fromEmail: "no-reply@example.com",
      fromName: "Crinity Helpdesk",
      sesAccessKey: null,
      sesSecretKey: null,
      sesRegion: "ap-northeast-2",
      resendApiKey: null,
      customerEmailsEnabled: true,
      internalNotificationsEnabled: true,
      notifyOnNewTicket: true,
      notifyOnAssign: true,
      notifyOnComment: true,
      notifyOnStatusChange: true,
      notifyOnSlaWarning: true,
      notifyOnSlaBreach: true,
      notifyCustomerOnTicketCreated: true,
      notifyCustomerOnAgentReply: true,
      notifyCustomerOnStatusChange: true,
      notifyCustomerOnCsatSurvey: true,
      notificationEmail: "admin@example.com",
      testMode: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    vi.mocked(prisma.emailThreadMapping.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.emailThreadMapping.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.emailThreadMapping.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("enqueues a pending email delivery with category metadata", async () => {
    const db = createDbMock();
    db.emailDelivery.create.mockResolvedValue({
      id: "delivery-1",
      to: "customer@example.com",
      subject: "문의 접수 안내",
      body: "본문",
      category: "CUSTOMER",
      ticketId: null,
      messageId: null,
      inReplyTo: null,
      references: null,
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await enqueueEmail(
      {
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        category: "CUSTOMER",
      },
      db,
    );

    expect(db.emailDelivery.create).toHaveBeenCalledWith({
      data: {
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        category: "CUSTOMER",
        ticketId: null,
        messageId: null,
        inReplyTo: null,
        references: null,
        status: "PENDING",
      },
    });
    expect(result.id).toBe("delivery-1");
  });

  it("marks delivery as SENT when provider succeeds and passes from/headers", async () => {
    const db = createDbMock();
    const now = new Date("2026-01-01T00:00:00.000Z");
    db.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        category: "CUSTOMER",
        ticketId: "ticket-1",
        messageId: "<message-1@crinity.io>",
        inReplyTo: "<parent@crinity.io>",
        references: JSON.stringify(["<first@crinity.io>", "<parent@crinity.io>"]),
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const provider = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(provider.send).toHaveBeenCalledWith({
      to: "customer@example.com",
      subject: "문의 접수 안내",
      html: "본문",
      from: '"Crinity Helpdesk" <no-reply@example.com>',
      headers: {
        "Message-ID": "<message-1@crinity.io>",
        "In-Reply-To": "<parent@crinity.io>",
        References: "<first@crinity.io> <parent@crinity.io>",
      },
    });
    expect(db.emailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "SENT",
        attemptCount: 1,
        nextRetryAt: null,
        lastError: null,
      },
    });
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.retried).toBe(0);
  });

  it("skips customer deliveries when customer emails are disabled", async () => {
    const db = createDbMock();
    vi.mocked(prisma.emailSettings.findUnique).mockResolvedValue({
      id: "default",
      provider: "nodemailer",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "mailer@example.com",
      smtpPassword: "secret",
      fromEmail: "no-reply@example.com",
      fromName: "Crinity Helpdesk",
      sesAccessKey: null,
      sesSecretKey: null,
      sesRegion: "ap-northeast-2",
      resendApiKey: null,
      customerEmailsEnabled: false,
      internalNotificationsEnabled: true,
      notifyOnNewTicket: true,
      notifyOnAssign: true,
      notifyOnComment: true,
      notifyOnStatusChange: true,
      notifyOnSlaWarning: true,
      notifyOnSlaBreach: true,
      notifyCustomerOnTicketCreated: true,
      notifyCustomerOnAgentReply: true,
      notifyCustomerOnStatusChange: true,
      notifyCustomerOnCsatSurvey: true,
      notificationEmail: "admin@example.com",
      testMode: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const now = new Date("2026-01-01T00:00:00.000Z");
    db.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        category: "CUSTOMER",
        ticketId: null,
        messageId: null,
        inReplyTo: null,
        references: null,
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const provider = { send: vi.fn() };
    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(provider.send).not.toHaveBeenCalled();
    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("schedules first retry after 1 minute", async () => {
    const db = createDbMock();
    const now = new Date("2026-01-01T00:00:00.000Z");
    db.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        category: "INTERNAL",
        ticketId: null,
        messageId: null,
        inReplyTo: null,
        references: null,
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const provider = {
      send: vi.fn().mockRejectedValue(new Error("smtp unavailable")),
    };

    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(db.emailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "PENDING",
        attemptCount: 1,
        nextRetryAt: new Date("2026-01-01T00:01:00.000Z"),
        lastError: "smtp unavailable",
      },
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.retried).toBe(1);
  });

  it("marks delivery as FAILED on third failed attempt", async () => {
    const db = createDbMock();
    const now = new Date("2026-01-01T00:00:00.000Z");
    db.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        category: "INTERNAL",
        ticketId: null,
        messageId: null,
        inReplyTo: null,
        references: null,
        status: "PENDING",
        attemptCount: 2,
        nextRetryAt: now,
        lastError: "previous error",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const provider = {
      send: vi.fn().mockRejectedValue(new Error("still failing")),
    };

    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(db.emailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "FAILED",
        attemptCount: 3,
        nextRetryAt: null,
        lastError: "still failing",
      },
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
  });
});
