import type { LLMSettings } from "@prisma/client";
import { prisma } from "@crinity/db";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

export interface DashboardStats {
  todayCreated: number;
  todayResolved: number;
  openTickets: number;
  urgentTickets: number;
  slaAtRiskCount: number;
  avgFirstResponseMinutes: number | null;
  csatAvg: number | null;
  activeAgents: number;
  absentAgents: number;
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

function buildPrompt(stats: DashboardStats): string {
  const responseTime = stats.avgFirstResponseMinutes != null
    ? `${Math.round(stats.avgFirstResponseMinutes)}분`
    : "측정 불가";
  const csat = stats.csatAvg != null
    ? `${stats.csatAvg.toFixed(1)}점`
    : "데이터 없음";

  return `당신은 헬프데스크 운영 분석가입니다. 오늘의 운영 현황을 2~3문장으로 간결하게 브리핑해주세요.

=== 오늘의 운영 현황 ===
- 오늘 접수된 티켓: ${stats.todayCreated}건
- 오늘 해결된 티켓: ${stats.todayResolved}건
- 현재 열린 티켓: ${stats.openTickets}건
- 긴급 티켓: ${stats.urgentTickets}건
- SLA 위반 위험 티켓: ${stats.slaAtRiskCount}건 (마감 2시간 이내)
- 평균 초기 응답 시간: ${responseTime}
- CSAT 평균: ${csat}
- 활성 상담원: ${stats.activeAgents}명 (자리 비운: ${stats.absentAgents}명)

=== 요청사항 ===
- 2~3문장으로 간결하게 작성하세요.
- 오늘 주목해야 할 포인트와 위험 신호를 중심으로 작성하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

브리핑:`;
}

export async function generateDashboardBrief(
  stats: DashboardStats
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;

  try {
    const result = await runProvider(buildPrompt(stats), settings);
    return result.trim();
  } catch (error) {
    console.error("generateDashboardBrief failed:", error);
    return null;
  }
}
