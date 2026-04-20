import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockFindUniqueWebhook, mockDispatchWebhookEvent } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUniqueWebhook: vi.fn(),
  mockDispatchWebhookEvent: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    webhookEndpoint: {
      findUnique: mockFindUniqueWebhook,
    },
  },
}));

vi.mock("@suppo/shared/integrations/outbound-webhooks", () => ({
  dispatchWebhookEvent: mockDispatchWebhookEvent,
}));

import { POST } from "@/app/api/admin/integrations/webhooks/[id]/test/route";

describe("POST /api/admin/integrations/webhooks/[id]/test", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUniqueWebhook.mockReset();
    mockDispatchWebhookEvent.mockReset();
  });

  it("returns 401 when the user is not an admin", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/integrations/webhooks/wh-1/test", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "wh-1" }) });

    expect(response.status).toBe(401);
  });

  it("dispatches a test webhook to the selected endpoint", async () => {
    mockAuth.mockResolvedValue({
      user: {
        role: "ADMIN",
        agentId: "agent-1",
        name: "관리자",
        email: "admin@suppo.io",
      },
    });
    mockFindUniqueWebhook.mockResolvedValue({
      id: "wh-1",
      name: "테스트 Webhook",
      url: "http://example.com/webhook",
    });
    mockDispatchWebhookEvent.mockResolvedValue({ sent: 1 });

    const request = new NextRequest("http://localhost/api/admin/integrations/webhooks/wh-1/test", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "wh-1" }) });

    expect(response.status).toBe(200);
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      "webhook.test",
      expect.objectContaining({
        source: "admin-test",
        webhookId: "wh-1",
        webhookName: "테스트 Webhook",
      }),
      {
        endpointId: "wh-1",
        isTest: true,
      },
    );
  });
});
