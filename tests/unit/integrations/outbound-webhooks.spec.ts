import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindManyWebhookEndpoints, mockUpdateWebhookEndpoint, mockCreateWebhookDeliveryLog, mockFetch } = vi.hoisted(() => ({
  mockFindManyWebhookEndpoints: vi.fn(),
  mockUpdateWebhookEndpoint: vi.fn(),
  mockCreateWebhookDeliveryLog: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    webhookEndpoint: {
      findMany: mockFindManyWebhookEndpoints,
      update: mockUpdateWebhookEndpoint,
    },
    webhookDeliveryLog: {
      create: mockCreateWebhookDeliveryLog,
    },
  },
}));

global.fetch = mockFetch;

import { dispatchWebhookEvent } from "@suppo/shared/integrations/outbound-webhooks";

describe("dispatchWebhookEvent", () => {
  beforeEach(() => {
    mockFindManyWebhookEndpoints.mockReset();
    mockUpdateWebhookEndpoint.mockReset();
    mockCreateWebhookDeliveryLog.mockReset();
    mockFetch.mockReset();
  });

  it("sends matching webhook events and stores delivery metadata", async () => {
    mockFindManyWebhookEndpoints.mockResolvedValue([
      {
        id: "wh-1",
        name: "Ticket Created Hook",
        url: "https://example.com/webhooks/helpdesk",
        secret: "hook-secret",
        events: ["ticket.created"],
        isActive: true,
      },
      {
        id: "wh-2",
        name: "Comment Hook",
        url: "https://example.com/webhooks/comments",
        secret: null,
        events: ["ticket.commented"],
        isActive: true,
      },
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      text: vi.fn().mockResolvedValue("accepted"),
    });

    const result = await dispatchWebhookEvent("ticket.created", {
      ticketId: "ticket-1",
      ticketNumber: "TKT-2026-000123",
    });

    expect(result.sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://example.com/webhooks/helpdesk");
    expect(mockUpdateWebhookEndpoint).toHaveBeenCalledWith({
      where: { id: "wh-1" },
      data: {
        lastTriggeredAt: expect.any(Date),
        lastStatusCode: 202,
        lastError: null,
      },
    });
    expect(mockCreateWebhookDeliveryLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endpointId: "wh-1",
        event: "ticket.created",
        responseStatusCode: 202,
        errorMessage: null,
        isTest: false,
      }),
    });
  });

  it("can send a test webhook to one selected endpoint", async () => {
    mockFindManyWebhookEndpoints.mockResolvedValue([
      {
        id: "wh-1",
        name: "Webhook A",
        url: "https://example.com/a",
        secret: null,
        events: ["ticket.created"],
        isActive: true,
      },
      {
        id: "wh-2",
        name: "Webhook B",
        url: "https://example.com/b",
        secret: null,
        events: ["ticket.created"],
        isActive: true,
      },
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue("ok"),
    });

    const result = await dispatchWebhookEvent(
      "webhook.test",
      { message: "test" },
      { endpointId: "wh-2", isTest: true },
    );

    expect(result.sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/b",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
