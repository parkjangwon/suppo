import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/tickets/route";
import { NextRequest } from "next/server";
import { clearRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db/client";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    ticket: {
      create: vi.fn().mockResolvedValue({ ticketNumber: "CRN-TEST-1234" }),
    },
  },
}));

vi.mock("@/lib/security/captcha", () => ({
  verifyCaptcha: vi.fn().mockResolvedValue(true),
}));

describe("POST /api/tickets", () => {
  beforeEach(() => {
    clearRateLimit("127.0.0.1");
    vi.clearAllMocks();
  });

  const createValidFormData = () => {
    const formData = new FormData();
    formData.append("customerName", "홍길동");
    formData.append("customerEmail", "hong@example.com");
    formData.append("categoryId", "cat-1");
    formData.append("priority", "HIGH");
    formData.append("subject", "테스트 제목입니다");
    formData.append("description", "이것은 테스트 내용입니다. 20자가 넘어야 합니다. 충분히 길게 작성합니다.");
    formData.append("captchaToken", "test-token");
    return formData;
  };

  it("creates a ticket successfully", async () => {
    const formData = createValidFormData();
    const request = new NextRequest("http://localhost/api/tickets", {
      method: "POST",
      body: formData,
    });
    request.formData = async () => formData;

    const response = await POST(request);
    const data = await response.json();
    if (response.status !== 201) {
      console.log(data);
    }

    expect(response.status).toBe(201);
    expect(data.ticketNumber).toBe("CRN-TEST-1234");
    expect(prisma.ticket.create).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid form data", async () => {
    const formData = createValidFormData();
    formData.delete("customerEmail");
    
    const request = new NextRequest("http://localhost/api/tickets", {
      method: "POST",
      body: formData,
    });
    request.formData = async () => formData;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects files over 10MB", async () => {
    const formData = createValidFormData();
    
    const largeBuffer = new ArrayBuffer(11 * 1024 * 1024);
    const largeFile = new File([largeBuffer], "large.pdf", { type: "application/pdf" });
    formData.append("attachments", largeFile);
    
    const request = new NextRequest("http://localhost/api/tickets", {
      method: "POST",
      body: formData,
    });
    request.formData = async () => formData;

    const response = await POST(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain("10MB를 초과할 수 없습니다");
  });

  it("rejects more than 20 attachments", async () => {
    const formData = createValidFormData();
    
    for (let i = 0; i < 21; i++) {
      const file = new File(["test"], `test${i}.txt`, { type: "text/plain" });
      formData.append("attachments", file);
    }
    
    const request = new NextRequest("http://localhost/api/tickets", {
      method: "POST",
      body: formData,
    });
    request.formData = async () => formData;

    const response = await POST(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain("최대 20개의 파일만");
  });

  it("enforces rate limiting", async () => {
    const responses = [];
    
    for (let i = 0; i < 6; i++) {
      const formData = createValidFormData();
      const request = new NextRequest("http://localhost/api/tickets", {
        method: "POST",
        body: formData,
      });
      request.formData = async () => formData;
      
      responses.push(await POST(request));
    }
    
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status).not.toBe(429);
    }
    
    expect(responses[5].status).toBe(429);
  });
});
