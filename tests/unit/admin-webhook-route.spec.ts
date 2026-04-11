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

vi.mock("@crinity/db", () => ({
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
  });

  it("rejects localhost webhook targets", async () => {
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
        url: "https://localhost/webhook",
        events: ["ticket.created"],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockCreateWebhook).not.toHaveBeenCalled();
  });
});
