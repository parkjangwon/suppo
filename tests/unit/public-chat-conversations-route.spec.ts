import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateChatConversation, mockVerifyCaptcha } = vi.hoisted(() => ({
  mockCreateChatConversation: vi.fn(),
  mockVerifyCaptcha: vi.fn(),
}));

vi.mock("@crinity/shared/chat/service", () => ({
  createChatConversation: mockCreateChatConversation,
}));

vi.mock("@crinity/shared/security/captcha", () => ({
  verifyCaptcha: mockVerifyCaptcha,
}));

import { POST } from "../../apps/public/src/app/api/chat/conversations/route";

describe("public chat conversations route", () => {
  beforeEach(() => {
    mockCreateChatConversation.mockReset();
    mockVerifyCaptcha.mockReset();
    mockVerifyCaptcha.mockResolvedValue(true);
  });

  it("returns 400 when captcha verification fails", async () => {
    mockVerifyCaptcha.mockResolvedValue(false);

    const request = new NextRequest("http://localhost/api/chat/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customerName: "고객",
        customerEmail: "chat@example.com",
        initialMessage: "실시간 채팅을 시작하고 싶습니다.",
        captchaToken: "bad-token",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockCreateChatConversation).not.toHaveBeenCalled();
  });

  it("returns 400 when the request body is invalid", async () => {
    const request = new NextRequest("http://localhost/api/chat/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customerName: "",
        customerEmail: "invalid-email",
        initialMessage: "짧음",
        captchaToken: "dev-token-bypass",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockCreateChatConversation).not.toHaveBeenCalled();
  });

  it("creates a conversation when the request is valid", async () => {
    mockCreateChatConversation.mockResolvedValue({
      conversationId: "conversation-1",
      ticketId: "ticket-1",
      ticketNumber: "CRN-CHAT-0001",
      customerToken: "chat_token",
      assigneeId: "agent-1",
    });

    const request = new NextRequest("http://localhost/api/chat/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customerName: "고객",
        customerEmail: "chat@example.com",
        initialMessage: "실시간 채팅을 시작하고 싶습니다.",
        captchaToken: "dev-token-bypass",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockVerifyCaptcha).toHaveBeenCalledWith("dev-token-bypass");
    expect(data.conversationId).toBe("conversation-1");
  });
});
