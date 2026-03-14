import { describe, expect, it, vi } from "vitest";

import { enqueueEmail } from "@/lib/email/enqueue";
import { processOutbox } from "@/lib/email/process-outbox";

function createDbMock() {
  return {
    emailDelivery: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  };
}

describe("email outbox", () => {
  it("enqueues a pending email delivery", async () => {
    const db = createDbMock();
    db.emailDelivery.create.mockResolvedValue({
      id: "delivery-1",
      to: "customer@example.com",
      subject: "문의 접수 안내",
      body: "본문",
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });

    const result = await enqueueEmail(
      {
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문"
      },
      db
    );

    expect(db.emailDelivery.create).toHaveBeenCalledWith({
      data: {
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        status: "PENDING"
      }
    });
    expect(result.id).toBe("delivery-1");
  });

  it("marks delivery as SENT when provider succeeds", async () => {
    const db = createDbMock();
    const now = new Date("2026-01-01T00:00:00.000Z");
    db.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        to: "customer@example.com",
        subject: "문의 접수 안내",
        body: "본문",
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now
      }
    ]);

    const provider = {
      send: vi.fn().mockResolvedValue(undefined)
    };

    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(provider.send).toHaveBeenCalledWith({
      to: "customer@example.com",
      subject: "문의 접수 안내",
      html: "본문"
    });
    expect(db.emailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "SENT",
        attemptCount: 1,
        nextRetryAt: null,
        lastError: null
      }
    });
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.retried).toBe(0);
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
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now
      }
    ]);

    const provider = {
      send: vi.fn().mockRejectedValue(new Error("smtp unavailable"))
    };

    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(db.emailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "PENDING",
        attemptCount: 1,
        nextRetryAt: new Date("2026-01-01T00:01:00.000Z"),
        lastError: "smtp unavailable"
      }
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
        status: "PENDING",
        attemptCount: 2,
        nextRetryAt: now,
        lastError: "previous error",
        createdAt: now,
        updatedAt: now
      }
    ]);

    const provider = {
      send: vi.fn().mockRejectedValue(new Error("still failing"))
    };

    const result = await processOutbox({ db, provider, now, limit: 10 });

    expect(db.emailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "FAILED",
        attemptCount: 3,
        nextRetryAt: null,
        lastError: "still failing"
      }
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
  });
});
