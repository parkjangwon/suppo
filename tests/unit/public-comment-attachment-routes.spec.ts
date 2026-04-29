import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCookies,
  mockVerifyTicketAccessToken,
  mockTicketFindUnique,
  mockCommentCreate,
  mockEmailSettingsFindUnique,
  mockProcessAttachments,
  mockCleanupProcessedAttachments,
} = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockVerifyTicketAccessToken: vi.fn(),
  mockTicketFindUnique: vi.fn(),
  mockCommentCreate: vi.fn(),
  mockEmailSettingsFindUnique: vi.fn(),
  mockProcessAttachments: vi.fn(),
  mockCleanupProcessedAttachments: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@suppo/shared/security/ticket-access", () => ({
  verifyTicketAccessToken: mockVerifyTicketAccessToken,
}));

vi.mock("@suppo/shared/storage/attachment-service", () => ({
  AttachmentError: class AttachmentError extends Error {},
  cleanupProcessedAttachments: mockCleanupProcessedAttachments,
  processAttachments: mockProcessAttachments,
}));

vi.mock("@suppo/shared/email/dispatch-trigger", () => ({
  dispatchEmailOutboxSoon: vi.fn(),
}));

vi.mock("@suppo/shared/email/enqueue", () => ({
  enqueueInternalCommentNotifications: vi.fn(),
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    ticket: {
      findUnique: mockTicketFindUnique,
    },
    comment: {
      create: mockCommentCreate,
    },
    emailSettings: {
      findUnique: mockEmailSettingsFindUnique,
    },
  },
}));

import { POST } from "../../apps/public/src/app/api/comments/public/route";

function buildRequest(formData: FormData) {
  return {
    formData: async () => formData,
  } as Request;
}

describe("public comment attachments route", () => {
  beforeEach(() => {
    mockCookies.mockReset();
    mockVerifyTicketAccessToken.mockReset();
    mockTicketFindUnique.mockReset();
    mockCommentCreate.mockReset();
    mockEmailSettingsFindUnique.mockReset();
    mockProcessAttachments.mockReset();
    mockCleanupProcessedAttachments.mockReset();

    mockCookies.mockResolvedValue({
      get: () => ({ value: "ticket-token" }),
    });
    mockVerifyTicketAccessToken.mockResolvedValue({
      ticketNumber: "TKT-1",
      email: "user@example.com",
    });
    mockTicketFindUnique
      .mockResolvedValueOnce({
        ticketNumber: "TKT-1",
        customerEmail: "user@example.com",
        customerName: "User",
      })
      .mockResolvedValueOnce({
        assignee: { email: "agent@example.com" },
      });
    mockEmailSettingsFindUnique.mockResolvedValue({ notificationEmail: "ops@example.com" });
  });

  it("accepts public comments that only contain attachments", async () => {
    mockProcessAttachments.mockResolvedValue([
      {
        fileName: "debug.txt",
        fileSize: 9,
        mimeType: "text/plain",
        fileUrl: "/uploads/ticket-1/debug.txt",
      },
    ]);
    mockCommentCreate.mockResolvedValue({
      id: "comment-1",
      content: "",
      isInternal: false,
      attachments: [],
    });

    const formData = new FormData();
    formData.append("ticketId", "ticket-1");
    formData.append("content", "");
    formData.append("attachments", new File(["debug"], "debug.txt", { type: "text/plain" }));

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(200);
    expect(mockCommentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ content: "" }),
    }));
  });

  it("cleans up public comment attachments if DB creation fails", async () => {
    const processed = [
      {
        fileName: "debug.txt",
        fileSize: 9,
        mimeType: "text/plain",
        fileUrl: "/uploads/ticket-1/debug.txt",
      },
    ];
    mockProcessAttachments.mockResolvedValue(processed);
    mockCommentCreate.mockRejectedValue(new Error("db failed"));

    const formData = new FormData();
    formData.append("ticketId", "ticket-1");
    formData.append("content", "");
    formData.append("attachments", new File(["debug"], "debug.txt", { type: "text/plain" }));

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(500);
    expect(mockCleanupProcessedAttachments).toHaveBeenCalledWith(processed);
  });

  it("rejects public comments with neither content nor attachments", async () => {
    const formData = new FormData();
    formData.append("ticketId", "ticket-1");
    formData.append("content", "   ");

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(400);
    expect(mockProcessAttachments).not.toHaveBeenCalled();
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });
});
