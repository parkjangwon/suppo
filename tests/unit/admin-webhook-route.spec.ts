import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockFindManyWebhooks, mockCreateWebhook } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindManyWebhooks: vi.fn(),
  mockCreateWebhook: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    webhookEndpoint: {
      findMany: mockFindManyWebhooks,
      create: mockCreateWebhook,
    },
  },
}));

import { POST } from "@/app/api/admin/integrations/webhooks/route";

describe("admin webhook route", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindManyWebhooks.mockReset();
    mockCreateWebhook.mockReset();
    mockCreateWebhook.mockResolvedValue({
      id: "wh-1",
      name: "Local webhook",
      url: "http://127.0.0.1:3001/webhook",
      secret: null,
      events: ["ticket.created"],
      isActive: true,
      lastTriggeredAt: null,
      lastStatusCode: null,
      lastError: null,
      createdAt: "2026-04-12T00:00:00.000Z",
    });
  });

  it("allows localhost webhook targets outside production", async () => {
    mockAuth.mockResolvedValue({
      user: {
        role: "ADMIN",
        agentId: "agent-1",
      },
    });

    const request = new NextRequest("http://localhost/api/admin/integrations/webhooks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Local webhook",
        url: "http://127.0.0.1:3001/webhook",
        events: ["ticket.created"],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockCreateWebhook).toHaveBeenCalled();
  });
});
