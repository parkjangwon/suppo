import { describe, expect, it } from "vitest";

import { getTicketQueuePresets } from "@/lib/tickets/ticket-queue-presets";

describe("getTicketQueuePresets", () => {
  it("returns the built-in operational queues for the ticket list", () => {
    const presets = getTicketQueuePresets("agent-123");

    expect(presets.map((preset) => preset.label)).toEqual([
      "오늘 처리",
      "긴급",
      "VIP",
      "내 담당",
      "SLA 임박",
    ]);

    expect(presets.find((preset) => preset.label === "내 담당")?.filter.assigneeId).toBe("agent-123");
    expect(presets.find((preset) => preset.label === "VIP")?.filter.customerSegment).toBe("vip");
    expect(presets.find((preset) => preset.label === "SLA 임박")?.filter.slaState).toBe("warning");
  });
});
