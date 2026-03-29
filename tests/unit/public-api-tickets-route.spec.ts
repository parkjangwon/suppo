import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAuthenticatePublicApiKey, mockCreateTicket, mockFindManyTickets } = vi.hoisted(() => ({
  mockAuthenticatePublicApiKey: vi.fn(),
  mockCreateTicket: vi.fn(),
  mockFindManyTickets: vi.fn(),
}));

vi.mock("@/lib/public-api/auth", () => ({
  authenticatePublicApiKey: mockAuthenticatePublicApiKey,
}));

vi.mock("@crinity/db", () => ({
  prisma: {
    ticket: {
      findMany: mockFindManyTickets,
    },
  },
}));

vi.mock("@crinity/shared/tickets/create-ticket", () => ({
  createTicket: mockCreateTicket,
}));

vi.mock("@crinity/shared/integrations/outbound-webhooks", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue({ sent: 0 }),
}));

import { GET, POST } from "@/app/api/public/tickets/route";

describe("public tickets api route", () => {
  beforeEach(() => {
    mockAuthenticatePublicApiKey.mockReset();
    mockCreateTicket.mockReset();
    mockFindManyTickets.mockReset();
  });

  it("returns 401 without a valid api key", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/public/tickets");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("creates a ticket with a valid api key", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue({ id: "key-1", name: "Integration Key" });
    mockCreateTicket.mockResolvedValue({
      ticket: {
        id: "ticket-1",
        ticketNumber: "TKT-2026-000777",
      },
    });

    const request = new NextRequest("http://localhost/api/public/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "crn_live_test",
      },
      body: JSON.stringify({
        customerName: "API 고객",
        customerEmail: "api@example.com",
        requestTypeId: "request-type-1",
        priority: "MEDIUM",
        subject: "API 생성 티켓",
        description: "외부 API로 생성한 티켓",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ticketNumber).toBe("TKT-2026-000777");
  });
});
