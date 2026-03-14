import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH } from "@/app/api/tickets/[id]/route";
import { GET as GET_LIST } from "@/app/api/tickets/route";
import { POST as POST_COMMENT } from "@/app/api/comments/route";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/guards", () => ({
  requireAgent: vi.fn().mockResolvedValue({
    id: "agent-1",
    role: "AGENT",
    email: "agent@example.com",
    name: "Agent 1",
  }),
  requireAdmin: vi.fn().mockResolvedValue({
    id: "admin-1",
    role: "ADMIN",
    email: "admin@example.com",
    name: "Admin 1",
  }),
}));

// Mock queries
vi.mock("@/lib/db/queries/admin-tickets", () => ({
  getAdminTickets: vi.fn().mockResolvedValue({
    tickets: [{ id: "ticket-1", ticketNumber: "CRN-1234" }],
    nextCursor: null,
  }),
  getAdminTicketDetail: vi.fn().mockResolvedValue({
    id: "ticket-1",
    ticketNumber: "CRN-1234",
    assigneeId: "agent-1",
  }),
  updateTicketStatus: vi.fn().mockResolvedValue({ id: "ticket-1", status: "IN_PROGRESS" }),
  updateTicketPriority: vi.fn().mockResolvedValue({ id: "ticket-1", priority: "HIGH" }),
  assignTicket: vi.fn().mockResolvedValue({ id: "ticket-1", assigneeId: "agent-2" }),
  addComment: vi.fn().mockResolvedValue({ id: "comment-1", content: "Test comment" }),
}));

describe("Admin Ticket Actions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tickets", () => {
    it("returns paginated list for agent", async () => {
      const request = new NextRequest("http://localhost/api/tickets?status=OPEN");
      const response = await GET_LIST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tickets).toHaveLength(1);
    });
  });

  describe("GET /api/tickets/[id]", () => {
    it("returns ticket detail for agent", async () => {
      const request = new NextRequest("http://localhost/api/tickets/ticket-1");
      const response = await GET(request, { params: { id: "ticket-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("ticket-1");
    });
  });

  describe("PATCH /api/tickets/[id]", () => {
    it("updates ticket status", async () => {
      const request = new NextRequest("http://localhost/api/tickets/ticket-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      const response = await PATCH(request, { params: { id: "ticket-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("IN_PROGRESS");
    });
  });

  describe("POST /api/comments", () => {
    it("adds an internal note", async () => {
      const request = new NextRequest("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({
          ticketId: "ticket-1",
          content: "Internal note",
          isInternal: true,
        }),
      });
      const response = await POST_COMMENT(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("comment-1");
    });
  });
});
