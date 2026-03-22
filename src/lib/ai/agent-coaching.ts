import type { LLMSettings } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

export interface AgentStats {
  name: string;
  ticketsHandled: number;
  resolved: number;
  csatAvg: number | null;
  avgFirstResponseMinutes: number | null;
  currentTickets: number;
  topCategory: string | null;
}

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  if (provider === "ollama") return callOllama(prompt, settings);
  if (provider === "gemini") return callGemini(prompt, settings);
  throw new Error(`지원하지 않는 LLM provider: ${settings.provider}`);
}

function buildPrompt(agents: AgentStats[]): string {
  const agentText = agents
    .map((a) => [
      `[${a.name}]`,
      `  처리: ${a.ticketsHandled}건, 해결: ${a.resolved}건`,
      `  CSAT: ${a.csatAvg != null ? a.csatAvg.toFixed(1) + "점" : "데이터 없음"}`,
      `  평균 첫 응답: ${a.avgFirstResponseMinutes != null ? Math.round(a.avgFirstResponseMinutes) + "분" : "측정 불가"}`,
      `  현재 배정: ${a.currentTickets}건`,
      `  주요 카테고리: ${a.topCategory ?? "없음"}`,
    ].join("\n"))
    .join("\n\n");

  return `당신은 헬프데스크 팀 매니저 코치입니다. 상담원 성과 데이터를 분석하여 팀 전반의 현황과 구체적인 코칭 포인트를 제시해주세요.

=== 상담원 성과 (최근 30일) ===
${agentText}

=== 요청사항 ===
- 팀 전반의 강점과 약점을 먼저 요약하세요.
- 개선이 필요한 상담원에게는 구체적인 코칭 포인트를 제시하세요.
- 특정 상담원을 지나치게 부정적으로 표현하지 마세요. 건설적이고 발전적인 어조를 유지하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

코칭 분석:`;
}

export async function generateAgentCoaching(agents: AgentStats[]): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;
  try {
    return (await runProvider(buildPrompt(agents), settings)).trim();
  } catch (error) {
    console.error("generateAgentCoaching failed:", error);
    return null;
  }
}
