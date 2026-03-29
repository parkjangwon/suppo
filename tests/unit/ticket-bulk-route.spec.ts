import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockBulkUpdateTickets, mockGetAdminTicketDetail } = vi.hoisted(() => ({
  mockBulkUpdateTickets: vi.fn(),
  mockGetAdminTicketDetail: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "admin-1", role: "ADMIN", agentId: "admin-1" },
  }),
}));

vi.mock("@/lib/tickets/bulk-update", () => ({
  bulkUpdateTickets: mockBulkUpdateTickets,
}));

vi.mock("@/lib/db/queries/admin-tickets", () => ({
  getAdminTicketDetail: mockGetAdminTicketDetail,
}));

import { POST } from "@/app/api/admin/tickets/bulk/route";

describe("POST /api/admin/tickets/bulk", () => {
  beforeEach(() => {
    mockBulkUpdateTickets.mockReset();
    mockGetAdminTicketDetail.mockReset();
  });

  it("returns 400 when no changes are requested", async () => {
    const request = new NextRequest("http://localhost/api/admin/tickets/bulk", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ticketIds: ["ticket-1"],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("runs bulk updates for admins", async () => {
    mockBulkUpdateTickets.mockResolvedValue({
      updatedCount: 2,
      ticketIds: ["ticket-1", "ticket-2"],
    });

    const request = new NextRequest("http://localhost/api/admin/tickets/bulk", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ticketIds: ["ticket-1", "ticket-2"],
        status: "IN_PROGRESS",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockBulkUpdateTickets).toHaveBeenCalledWith({
      ticketIds: ["ticket-1", "ticket-2"],
      actorId: "admin-1",
      updates: {
        status: "IN_PROGRESS",
      },
    });
    expect(data.updatedCount).toBe(2);
  });
});
