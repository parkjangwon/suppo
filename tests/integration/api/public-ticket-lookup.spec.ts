import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../src/app/api/tickets/lookup/route";
import { prisma } from "../../../src/lib/db/client";

vi.mock("../../../src/lib/db/client", () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Public Ticket Lookup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success and sets cookie for valid credentials", async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      customerEmail: "api@example.com",
    } as any);

    const request = new Request("http://localhost/api/tickets/lookup", {
      method: "POST",
      body: JSON.stringify({
        ticketNumber: "CRN-API123",
        email: "api@example.com",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    
    const cookies = response.headers.get("set-cookie");
    expect(cookies).toContain("ticket_access=");
  });

  it("returns 404 for invalid ticket number", async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost/api/tickets/lookup", {
      method: "POST",
      body: JSON.stringify({
        ticketNumber: "CRN-INVALID",
        email: "api@example.com",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    
    const body = await response.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 404 for invalid email", async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      customerEmail: "other@example.com",
    } as any);

    const request = new Request("http://localhost/api/tickets/lookup", {
      method: "POST",
      body: JSON.stringify({
        ticketNumber: "CRN-API123",
        email: "wrong@example.com",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    
    const body = await response.json();
    expect(body.error).toBe("Not found");
  });
});
