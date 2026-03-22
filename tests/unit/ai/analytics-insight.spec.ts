import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@crinity/db", () => ({
  prisma: { lLMSettings: { upsert: vi.fn() } },
}));
vi.mock("@/lib/llm/providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/llm/providers/ollama", () => ({ callOllama: vi.fn() }));

import { generateAnalyticsInsight } from "@/lib/ai/analytics-insight";
import { prisma } from "@crinity/db";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default",
  provider: "gemini",
  analysisEnabled: true,
  geminiApiKey: "k",
  geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  analysisPrompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMetrics = {
  preset: "30d" as const,
  totalTickets: 120,
  resolvedTickets: 98,
  resolutionRate: 81.7,
  avgFirstResponseMinutes: 32,
  avgResolutionMinutes: 480,
  csatAvg: 4.1,
  csatResponseRate: 62,
  topCategories: [
    { name: "기술 지원", count: 45 },
    { name: "결제 문의", count: 30 },
  ],
  topAgents: [{ name: "김지수", resolved: 28, csatAvg: 4.5 }],
  bottomAgents: [{ name: "이민준", resolved: 5, csatAvg: 3.2 }],
};

beforeEach(() => vi.clearAllMocks());

describe("generateAnalyticsInsight", () => {
  it("analysisEnabled false → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({
      ...mockSettings,
      analysisEnabled: false,
    });
    expect(await generateAnalyticsInsight(mockMetrics)).toBeNull();
  });

  it("LLM 결과 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  인사이트 내용  ");
    expect(await generateAnalyticsInsight(mockMetrics)).toBe("인사이트 내용");
  });

  it("LLM 실패 → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("err"));
    expect(await generateAnalyticsInsight(mockMetrics)).toBeNull();
  });
});
