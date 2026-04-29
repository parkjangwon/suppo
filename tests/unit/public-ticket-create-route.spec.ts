import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockCheckRateLimit,
  mockVerifyCaptcha,
  mockCreateTicket,
  mockClassifyTicket,
  mockFindManyCategories,
  mockFindManyTeams,
  mockProcessAttachments,
  mockCleanupProcessedAttachments,
  mockAttachmentCreateMany,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockVerifyCaptcha: vi.fn(),
  mockCreateTicket: vi.fn(),
  mockClassifyTicket: vi.fn(),
  mockFindManyCategories: vi.fn(),
  mockFindManyTeams: vi.fn(),
  mockProcessAttachments: vi.fn(),
  mockCleanupProcessedAttachments: vi.fn(),
  mockAttachmentCreateMany: vi.fn(),
}));

vi.mock("@suppo/shared/security/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
}));

vi.mock("@suppo/shared/security/captcha", () => ({
  verifyCaptcha: mockVerifyCaptcha,
}));

vi.mock("@suppo/shared/tickets/create-ticket", () => ({
  createTicket: mockCreateTicket,
}));

vi.mock("@suppo/shared/ai/classifier", () => ({
  classifyTicket: mockClassifyTicket,
}));

vi.mock("@suppo/shared/storage/attachment-service", () => ({
  AttachmentError: class AttachmentError extends Error {},
  cleanupProcessedAttachments: mockCleanupProcessedAttachments,
  processAttachments: mockProcessAttachments,
}));

vi.mock("@suppo/shared/integrations/outbound-webhooks", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue({ sent: 0 }),
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    category: {
      findMany: mockFindManyCategories,
    },
    team: {
      findMany: mockFindManyTeams,
    },
    ticket: {
      update: vi.fn(),
    },
    attachment: {
      createMany: mockAttachmentCreateMany,
    },
  },
}));

import { POST } from "../../apps/public/src/app/api/tickets/route";

function buildRequest(formData: FormData) {
  return {
    headers: new Headers({
      "x-forwarded-for": "203.0.113.10",
    }),
    formData: async () => formData,
  } as NextRequest;
}

describe("public ticket create route", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset();
    mockVerifyCaptcha.mockReset();
    mockCreateTicket.mockReset();
    mockClassifyTicket.mockReset();
    mockFindManyCategories.mockReset();
    mockFindManyTeams.mockReset();
    mockProcessAttachments.mockReset();
    mockCleanupProcessedAttachments.mockReset();
    mockAttachmentCreateMany.mockReset();

    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60_000,
    });
    mockVerifyCaptcha.mockResolvedValue(true);
    mockClassifyTicket.mockResolvedValue(null);
    mockFindManyCategories.mockResolvedValue([]);
    mockFindManyTeams.mockResolvedValue([]);
    mockAttachmentCreateMany.mockResolvedValue({ count: 0 });
  });

  it("returns 429 when the rate limit blocks the request", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    });

    const formData = new FormData();
    formData.append("customerName", "테스트 고객");
    formData.append("customerEmail", "user@example.com");
    formData.append("requestTypeId", "request-type-1");
    formData.append("priority", "MEDIUM");
    formData.append("subject", "충분히 긴 제목입니다");
    formData.append("description", "충분히 긴 설명입니다. 최소 길이를 넘깁니다.");
    formData.append("captchaToken", "dev-token-bypass");

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(429);
    expect(mockVerifyCaptcha).not.toHaveBeenCalled();
  });

  it("returns 400 when captcha verification fails", async () => {
    mockVerifyCaptcha.mockResolvedValue(false);

    const formData = new FormData();
    formData.append("customerName", "테스트 고객");
    formData.append("customerEmail", "user@example.com");
    formData.append("requestTypeId", "request-type-1");
    formData.append("priority", "MEDIUM");
    formData.append("subject", "충분히 긴 제목입니다");
    formData.append("description", "충분히 긴 설명입니다. 최소 길이를 넘깁니다.");
    formData.append("captchaToken", "bad-token");

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(400);
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it("creates a ticket when captcha verification succeeds", async () => {
    mockCreateTicket.mockResolvedValue({
      ticket: {
        id: "ticket-1",
        ticketNumber: "CRN-2026-0001",
        subject: "충분히 긴 제목입니다",
        priority: "MEDIUM",
        status: "OPEN",
        customerEmail: "user@example.com",
      },
    });

    const formData = new FormData();
    formData.append("customerName", "테스트 고객");
    formData.append("customerEmail", "user@example.com");
    formData.append("requestTypeId", "request-type-1");
    formData.append("priority", "MEDIUM");
    formData.append("subject", "충분히 긴 제목입니다");
    formData.append("description", "충분히 긴 설명입니다. 최소 길이를 넘깁니다.");
    formData.append("captchaToken", "dev-token-bypass");

    const response = await POST(buildRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockVerifyCaptcha).toHaveBeenCalledWith("dev-token-bypass");
    expect(data.ticketNumber).toBe("CRN-2026-0001");
  });

  it("cleans up uploaded files when attachment DB insert fails", async () => {
    const processed = [
      {
        fileName: "debug.txt",
        fileSize: 9,
        mimeType: "text/plain",
        fileUrl: "/uploads/ticket-1/debug.txt",
      },
    ];
    mockCreateTicket.mockResolvedValue({
      ticket: {
        id: "ticket-1",
        ticketNumber: "CRN-2026-0001",
        subject: "충분히 긴 제목입니다",
        priority: "MEDIUM",
        status: "OPEN",
        customerEmail: "user@example.com",
      },
    });
    mockProcessAttachments.mockResolvedValue(processed);
    mockAttachmentCreateMany.mockRejectedValue(new Error("db failed"));

    const formData = new FormData();
    formData.append("customerName", "테스트 고객");
    formData.append("customerEmail", "user@example.com");
    formData.append("requestTypeId", "request-type-1");
    formData.append("priority", "MEDIUM");
    formData.append("subject", "충분히 긴 제목입니다");
    formData.append("description", "충분히 긴 설명입니다. 최소 길이를 넘깁니다.");
    formData.append("captchaToken", "dev-token-bypass");
    formData.append("attachments", new File(["debug"], "debug.txt", { type: "text/plain" }));

    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(500);
    expect(mockCleanupProcessedAttachments).toHaveBeenCalledWith(processed);
  });
});
