import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuth,
  mockAddComment,
  mockGetAdminTicketDetail,
  mockProcessAttachments,
  mockCleanupProcessedAttachments,
  mockEmailSettingsFindUnique,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockAddComment: vi.fn(),
  mockGetAdminTicketDetail: vi.fn(),
  mockProcessAttachments: vi.fn(),
  mockCleanupProcessedAttachments: vi.fn(),
  mockEmailSettingsFindUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db/queries/admin-tickets", () => ({
  addComment: mockAddComment,
  getAdminTicketDetail: mockGetAdminTicketDetail,
  updateTicketStatus: vi.fn(),
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
  enqueueNewCommentEmail: vi.fn(),
}));

vi.mock("@suppo/shared/integrations/outbound-webhooks", () => ({
  dispatchWebhookEvent: vi.fn(),
}));

vi.mock("@suppo/shared/notifications/sse-service", () => ({
  notificationService: { notify: vi.fn() },
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    emailSettings: {
      findUnique: mockEmailSettingsFindUnique,
    },
  },
}));

import { POST } from "@/app/api/comments/route";

function buildRequest(formData: FormData) {
  return {
    formData: async () => formData,
  } as NextRequest;
}

describe("admin comment attachments route", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockAddComment.mockReset();
    mockGetAdminTicketDetail.mockReset();
    mockProcessAttachments.mockReset();
    mockCleanupProcessedAttachments.mockReset();
    mockEmailSettingsFindUnique.mockReset();

    mockAuth.mockResolvedValue({
      user: {
        agentId: "agent-1",
        email: "agent@example.com",
        name: "Agent",
        role: "AGENT",
      },
    });
    mockGetAdminTicketDetail.mockResolvedValue({
      id: "ticket-1",
      ticketNumber: "TKT-1",
      customerEmail: "user@example.com",
      assigneeId: "agent-1",
      status: "IN_PROGRESS",
      assignee: { email: "agent@example.com" },
    });
    mockEmailSettingsFindUnique.mockResolvedValue({ notificationEmail: "ops@example.com" });
  });

  it("accepts comments that only contain attachments", async () => {
    mockProcessAttachments.mockResolvedValue([
      {
        fileName: "debug.txt",
        fileSize: 9,
        mimeType: "text/plain",
        fileUrl: "/uploads/ticket-1/debug.txt",
      },
    ]);
    mockAddComment.mockResolvedValue({
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

    expect(response.status).toBe(201);
    expect(mockAddComment).toHaveBeenCalledWith(expect.objectContaining({ content: "" }));
  });

  it("cleans up saved files if DB comment creation fails", async () => {
    const processed = [
      {
        fileName: "debug.txt",
        fileSize: 9,
        mimeType: "text/plain",
        fileUrl: "/uploads/ticket-1/debug.txt",
      },
    ];
    mockProcessAttachments.mockResolvedValue(processed);
    mockAddComment.mockRejectedValue(new Error("db failed"));

    const formData = new FormData();
    formData.append("ticketId", "ticket-1");
    formData.append("content", "");
    formData.append("attachments", new File(["debug"], "debug.txt", { type: "text/plain" }));

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(500);
    expect(mockCleanupProcessedAttachments).toHaveBeenCalledWith(processed);
  });

  it("rejects comments with neither content nor attachments", async () => {
    const formData = new FormData();
    formData.append("ticketId", "ticket-1");
    formData.append("content", "   ");

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(400);
    expect(mockProcessAttachments).not.toHaveBeenCalled();
    expect(mockAddComment).not.toHaveBeenCalled();
  });
});
