import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockExecuteScheduledAutomationRules, mockCheckSLABreaches } = vi.hoisted(() => ({
  mockExecuteScheduledAutomationRules: vi.fn(),
  mockCheckSLABreaches: vi.fn(),
}));

vi.mock("@/lib/automation/engine", () => ({
  executeScheduledAutomationRules: mockExecuteScheduledAutomationRules,
}));

vi.mock("@/lib/sla/engine", () => ({
  checkSLABreaches: mockCheckSLABreaches,
}));

import { POST } from "@/app/api/internal/automation-dispatch/route";

describe("POST /api/internal/automation-dispatch", () => {
  const originalEnv = process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN;

  beforeEach(() => {
    mockExecuteScheduledAutomationRules.mockReset();
    mockCheckSLABreaches.mockReset();
    process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN = "test-automation-token";
  });

  afterAll(() => {
    process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN = originalEnv;
  });

  it("returns 401 without a valid internal token", async () => {
    const request = new NextRequest("http://localhost/api/internal/automation-dispatch", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("runs SLA checks and scheduled automation with a valid token", async () => {
    mockExecuteScheduledAutomationRules.mockResolvedValue({
      processedRules: 2,
      matchedTickets: 3,
      updatedTickets: 2,
    });
    mockCheckSLABreaches.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/internal/automation-dispatch", {
      method: "POST",
      headers: {
        "x-internal-token": "test-automation-token",
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockCheckSLABreaches).toHaveBeenCalledOnce();
    expect(mockExecuteScheduledAutomationRules).toHaveBeenCalledOnce();
    expect(data.result.updatedTickets).toBe(2);
  });
});
