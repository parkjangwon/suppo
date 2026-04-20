import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@suppo/db", () => ({
  prisma: {
    lLMSettings: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm/providers/gemini", () => ({
  callGemini: vi.fn(),
}));

vi.mock("@/lib/llm/providers/ollama", () => ({
  callOllama: vi.fn(),
}));

import { generateDashboardBrief } from "@/lib/ai/dashboard-brief";
import { prisma } from "@suppo/db";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default",
  provider: "gemini",
  analysisEnabled: true,
  geminiApiKey: "test-key",
  geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  analysisPrompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats = {
  todayCreated: 12,
  todayResolved: 8,
  openTickets: 34,
  urgentTickets: 3,
  slaAtRiskCount: 2,
  avgFirstResponseMinutes: 25,
  csatAvg: 4.2,
  activeAgents: 5,
  absentAgents: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("generateDashboardBrief", () => {
  it("analysisEnabled가 false이면 null 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({
      ...mockSettings,
      analysisEnabled: false,
    });

    const result = await generateDashboardBrief(mockStats);
    expect(result).toBeNull();
  });

  it("LLM 결과를 trim해서 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  오늘 운영 현황 브리핑입니다.  ");

    const result = await generateDashboardBrief(mockStats);
    expect(result).toBe("오늘 운영 현황 브리핑입니다.");
  });

  it("LLM 호출 실패 시 null 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("network error"));

    const result = await generateDashboardBrief(mockStats);
    expect(result).toBeNull();
  });
});
