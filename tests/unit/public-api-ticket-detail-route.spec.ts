import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuthenticatePublicApiKey,
  mockFindUniqueTicket,
  mockUpdateTicketStatus,
  mockUpdateTicketPriority,
  mockAssignTicket,
} = vi.hoisted(() => ({
  mockAuthenticatePublicApiKey: vi.fn(),
  mockFindUniqueTicket: vi.fn(),
  mockUpdateTicketStatus: vi.fn(),
  mockUpdateTicketPriority: vi.fn(),
  mockAssignTicket: vi.fn(),
}));

vi.mock("@/lib/public-api/auth", () => ({
  authenticatePublicApiKey: mockAuthenticatePublicApiKey,
  hasPublicApiScope: (apiKey: { scopes?: string[] }, scope: string) => apiKey.scopes?.includes(scope) ?? false,
}));

vi.mock("@crinity/db", () => ({
  prisma: {
    ticket: {
      findUnique: mockFindUniqueTicket,
    },
  },
}));

vi.mock("@/lib/db/queries/admin-tickets", () => ({
  updateTicketStatus: mockUpdateTicketStatus,
  updateTicketPriority: mockUpdateTicketPriority,
  assignTicket: mockAssignTicket,
}));

vi.mock("@crinity/shared/integrations/outbound-webhooks", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue({ sent: 0 }),
}));

import { GET, PATCH } from "@/app/api/public/tickets/[id]/route";

describe("public ticket detail api route", () => {
  beforeEach(() => {
    mockAuthenticatePublicApiKey.mockReset();
    mockFindUniqueTicket.mockReset();
    mockUpdateTicketStatus.mockReset();
    mockUpdateTicketPriority.mockReset();
    mockAssignTicket.mockReset();
  });

  it("returns a ticket when api key is valid", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue({
      id: "key-1",
      scopes: ["tickets:read"],
    });
    mockFindUniqueTicket.mockResolvedValue({
      id: "ticket-1",
      ticketNumber: "TKT-2026-000100",
      status: "OPEN",
      customerName: "API 고객",
      description: "설명",
    });

    const request = new NextRequest("http://localhost/api/public/tickets/ticket-1", {
      headers: {
        "x-api-key": "crn_live_test",
      },
    });

    const response = await GET(request, { params: Promise.resolve({ id: "ticket-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ticketNumber).toBe("TKT-2026-000100");
    expect(data.customerEmail).toBeUndefined();
  });

  it("updates ticket status when api key is valid", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue({
      id: "key-1",
      scopes: ["tickets:update"],
    });
    mockFindUniqueTicket.mockResolvedValue({
      id: "ticket-1",
      ticketNumber: "TKT-2026-000100",
      status: "OPEN",
      priority: "MEDIUM",
      assigneeId: null,
      subject: "API ticket",
    });
    mockUpdateTicketStatus.mockResolvedValue({
      id: "ticket-1",
      ticketNumber: "TKT-2026-000100",
      status: "IN_PROGRESS",
    });

    const request = new NextRequest("http://localhost/api/public/tickets/ticket-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-api-key": "crn_live_test",
      },
      body: JSON.stringify({
        status: "IN_PROGRESS",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "ticket-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateTicketStatus).toHaveBeenCalledWith("ticket-1", "IN_PROGRESS", null, "SYSTEM");
    expect(data.status).toBe("IN_PROGRESS");
  });

  it("returns 403 when the api key lacks update scope", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue({
      id: "key-1",
      scopes: ["tickets:read"],
    });
    mockFindUniqueTicket.mockResolvedValue({
      id: "ticket-1",
      ticketNumber: "TKT-2026-000100",
      status: "OPEN",
      priority: "MEDIUM",
      assigneeId: null,
      subject: "API ticket",
    });

    const request = new NextRequest("http://localhost/api/public/tickets/ticket-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-api-key": "crn_live_test",
      },
      body: JSON.stringify({
        status: "IN_PROGRESS",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "ticket-1" }) });

    expect(response.status).toBe(403);
    expect(mockUpdateTicketStatus).not.toHaveBeenCalled();
  });
});
