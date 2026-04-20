import type { LLMSettings } from "@prisma/client";
import { prisma } from "@suppo/db";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

import type { DatePreset } from "@/lib/db/queries/admin-analytics/contracts";

export interface AnalyticsMetrics {
  preset: Exclude<DatePreset, "custom">; // "7d" | "30d" | "90d"
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  csatAvg: number | null;
  csatResponseRate: number | null;
  topCategories: { name: string; count: number }[];
  topAgents: { name: string; resolved: number; csatAvg: number | null }[];
  bottomAgents: { name: string; resolved: number; csatAvg: number | null }[];
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

const PRESET_LABELS: Record<string, string> = {
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 90일",
};

function buildPrompt(m: AnalyticsMetrics): string {
  const categories = m.topCategories
    .map((c, i) => `  ${i + 1}. ${c.name}: ${c.count}건`)
    .join("\n");
  const topAgent = m.topAgents[0];
  const bottomAgent = m.bottomAgents[0];

  return `당신은 헬프데스크 분석 전문가입니다. 아래 지표를 분석하여 핵심 인사이트와 개선 권고사항을 서술해주세요.

=== 분석 기간: ${PRESET_LABELS[m.preset] ?? m.preset} ===
- 총 접수 티켓: ${m.totalTickets}건
- 해결 티켓: ${m.resolvedTickets}건 (해결률 ${m.resolutionRate.toFixed(1)}%)
- 평균 첫 응답 시간: ${m.avgFirstResponseMinutes != null ? Math.round(m.avgFirstResponseMinutes) + "분" : "측정 불가"}
- 평균 처리 시간: ${m.avgResolutionMinutes != null ? Math.round(m.avgResolutionMinutes / 60) + "시간" : "측정 불가"}
- CSAT 평균: ${m.csatAvg != null ? m.csatAvg.toFixed(1) + "점" : "데이터 없음"} (응답률 ${m.csatResponseRate != null ? m.csatResponseRate.toFixed(0) + "%" : "-"})

카테고리별 티켓 분포 (상위):
${categories || "  데이터 없음"}

${topAgent ? `성과 우수 상담원: ${topAgent.name} (해결 ${topAgent.resolved}건, CSAT ${topAgent.csatAvg?.toFixed(1) ?? "-"})` : ""}
${bottomAgent ? `개선 필요 상담원: ${bottomAgent.name} (해결 ${bottomAgent.resolved}건, CSAT ${bottomAgent.csatAvg?.toFixed(1) ?? "-"})` : ""}

=== 요청사항 ===
- 단순 수치 나열 금지. 수치의 의미와 원인을 해석하세요.
- 이상치가 있으면 원인을 추론하세요.
- 구체적인 개선 권고사항을 포함하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

분석:`;
}

export async function generateAnalyticsInsight(
  metrics: AnalyticsMetrics,
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;
  try {
    return (await runProvider(buildPrompt(metrics), settings)).trim();
  } catch (error) {
    console.error("generateAnalyticsInsight failed:", error);
    return null;
  }
}
