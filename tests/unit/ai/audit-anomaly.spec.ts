import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@suppo/db", () => ({ prisma: { lLMSettings: { upsert: vi.fn() } } }));
vi.mock("@/lib/llm/providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("@/lib/llm/providers/ollama", () => ({ callOllama: vi.fn() }));

import { generateAuditAnomalyReport } from "@/lib/ai/audit-anomaly";
import { prisma } from "@suppo/db";
import { callGemini } from "@/lib/llm/providers/gemini";

const mockSettings = {
  id: "default", provider: "gemini", analysisEnabled: true,
  geminiApiKey: "k", geminiModel: "gemini-1.5-flash",
  ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.2",
  analysisPrompt: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockLogs = [
  { actorName: "김관리자", actorEmail: "admin@test.com", action: "DELETE", resourceType: "Ticket", resourceId: "t1", description: "티켓 삭제", createdAt: "2026-03-22T03:17:00Z" },
  { actorName: "김관리자", actorEmail: "admin@test.com", action: "DELETE", resourceType: "Ticket", resourceId: "t2", description: "티켓 삭제", createdAt: "2026-03-22T03:18:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("generateAuditAnomalyReport", () => {
  it("analysisEnabled false → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue({ ...mockSettings, analysisEnabled: false });
    expect(await generateAuditAnomalyReport(mockLogs)).toBeNull();
  });

  it("LLM 결과 반환", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockResolvedValue("  이상 패턴 감지됨  ");
    expect(await generateAuditAnomalyReport(mockLogs)).toBe("이상 패턴 감지됨");
  });

  it("LLM 실패 → null", async () => {
    vi.mocked(prisma.lLMSettings.upsert).mockResolvedValue(mockSettings);
    vi.mocked(callGemini).mockRejectedValue(new Error("err"));
    expect(await generateAuditAnomalyReport(mockLogs)).toBeNull();
  });
});
