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

import { generateAgentCoaching } from "@/lib/ai/agent-coaching";
import { prisma } from "@suppo/db";
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

const mockAgents = [
  {
    name: "김지수",
    ticketsHandled: 42,
    resolved: 38,
    csatAvg: 4.5,
    avgFirstResponseMinutes: 15,
    currentTickets: 3,
    topCategory: "기술 지원",
  },
  {
    name: "이민준",
    ticketsHandled: 12,
    resolved: 7,
    csatAvg: 3.1,
    avgFirstResponseMinutes: 85,
    currentTickets: 8,
    topCategory: "결제 문의",
  },
];

beforeEach(() => vi.clearAllMocks());

describe("generateAgentCoaching", () => {
  it("analysisEnabled false → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({
      ...mockSettings,
      analysisEnabled: false,
    });
    expect(await generateAgentCoaching(mockAgents)).toBeNull();
  });

  it("LLM 결과 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  코칭 분석 결과  ");
    expect(await generateAgentCoaching(mockAgents)).toBe("코칭 분석 결과");
  });

  it("LLM 실패 → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("err"));
    expect(await generateAgentCoaching(mockAgents)).toBeNull();
  });
});
