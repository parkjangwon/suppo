import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAdminAuth,
  mockAttachmentFindUnique,
  mockCookies,
  mockVerifyTicketAccessToken,
  mockServeAttachmentFile,
} = vi.hoisted(() => ({
  mockAdminAuth: vi.fn(),
  mockAttachmentFindUnique: vi.fn(),
  mockCookies: vi.fn(),
  mockVerifyTicketAccessToken: vi.fn(),
  mockServeAttachmentFile: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAdminAuth,
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    attachment: {
      findUnique: mockAttachmentFindUnique,
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@suppo/shared/security/ticket-access", () => ({
  verifyTicketAccessToken: mockVerifyTicketAccessToken,
}));

vi.mock("@suppo/shared/storage/upload-route", async () => {
  const actual = await vi.importActual<typeof import("@suppo/shared/storage/upload-route")>("@suppo/shared/storage/upload-route");
  return {
    ...actual,
    serveAttachmentFile: mockServeAttachmentFile,
  };
});

describe("attachment download routes", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAdminAuth.mockReset();
    mockAttachmentFindUnique.mockReset();
    mockCookies.mockReset();
    mockVerifyTicketAccessToken.mockReset();
    mockServeAttachmentFile.mockReset();
    mockServeAttachmentFile.mockResolvedValue(new Response("file", { status: 200 }));
  });

  it("blocks unassigned agents from downloading another agent's ticket attachment", async () => {
    mockAdminAuth.mockResolvedValue({ user: { role: "AGENT", agentId: "agent-2" } });
    mockAttachmentFindUnique.mockResolvedValue({
      id: "attachment-1",
      fileUrl: "/uploads/ticket-1/file.txt",
      fileName: "file.txt",
      ticket: { assigneeId: "agent-1" },
    });

    const { GET } = await import("@/app/api/attachments/[id]/route");
    const response = await GET(new NextRequest("http://localhost/api/attachments/attachment-1"), {
      params: Promise.resolve({ id: "attachment-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockServeAttachmentFile).not.toHaveBeenCalled();
  });

  it("serves admin attachment downloads for authorized backoffice users", async () => {
    mockAdminAuth.mockResolvedValue({ user: { role: "AGENT", agentId: "agent-1" } });
    mockAttachmentFindUnique.mockResolvedValue({
      id: "attachment-1",
      fileUrl: "/uploads/ticket-1/file.txt",
      fileName: "file.txt",
      ticket: { assigneeId: "agent-1" },
    });

    const { GET } = await import("@/app/api/attachments/[id]/route");
    const response = await GET(new NextRequest("http://localhost/api/attachments/attachment-1"), {
      params: Promise.resolve({ id: "attachment-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockServeAttachmentFile).toHaveBeenCalledWith("/uploads/ticket-1/file.txt", "file.txt");
  });

  it("blocks public downloads for internal comment attachments", async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "ticket-token" }),
    });
    mockVerifyTicketAccessToken.mockResolvedValue({ ticketNumber: "TKT-1", email: "user@example.com" });
    mockAttachmentFindUnique.mockResolvedValue({
      id: "attachment-1",
      fileUrl: "/uploads/ticket-1/internal.txt",
      fileName: "internal.txt",
      ticket: { ticketNumber: "TKT-1", customerEmail: "user@example.com" },
      comment: { isInternal: true },
    });

    const { GET } = await import("../../apps/public/src/app/api/attachments/[id]/route");
    const response = await GET(new NextRequest("http://localhost/api/attachments/attachment-1"), {
      params: Promise.resolve({ id: "attachment-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockServeAttachmentFile).not.toHaveBeenCalled();
  });

  it("serves public downloads for the verified ticket owner", async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "ticket-token" }),
    });
    mockVerifyTicketAccessToken.mockResolvedValue({ ticketNumber: "TKT-1", email: "user@example.com" });
    mockAttachmentFindUnique.mockResolvedValue({
      id: "attachment-1",
      fileUrl: "/uploads/ticket-1/public.txt",
      fileName: "public.txt",
      ticket: { ticketNumber: "TKT-1", customerEmail: "user@example.com" },
      comment: { isInternal: false },
    });

    const { GET } = await import("../../apps/public/src/app/api/attachments/[id]/route");
    const response = await GET(new NextRequest("http://localhost/api/attachments/attachment-1"), {
      params: Promise.resolve({ id: "attachment-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockServeAttachmentFile).toHaveBeenCalledWith("/uploads/ticket-1/public.txt", "public.txt");
  });
});
