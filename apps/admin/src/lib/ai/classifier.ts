import type { LLMSettings, Category, Team } from "@prisma/client";
import { prisma } from "@crinity/db";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";
import { TicketPriority } from "@prisma/client";

const DEFAULT_SETTINGS_ID = "default";

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: { id: DEFAULT_SETTINGS_ID }
  });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();

  if (provider === "ollama") {
    return callOllama(prompt, settings);
  }

  if (provider === "gemini") {
    return callGemini(prompt, settings);
  }

  throw new Error(`지원하지 않는 LLM provider입니다: ${settings.provider}`);
}

export interface ClassificationResult {
  categoryId: string | null;
  priority: TicketPriority;
  teamId: string | null;
  confidence: number;
}

export async function classifyTicket(
  subject: string,
  description: string,
  availableCategories: Category[],
  availableTeams: Team[]
): Promise<ClassificationResult | null> {
  const settings = await getLlmSettings();

  if (!settings.analysisEnabled) {
    return null;
  }

  const categoryList = availableCategories.map(c => `- ${c.id}: ${c.name}${c.description ? ` (${c.description})` : ""}`).join("\n");
  const teamList = availableTeams.filter(t => t.isActive).map(t => `- ${t.id}: ${t.name}${t.description ? ` (${t.description})` : ""}`).join("\n");

  const prompt = `당신은 티켓 분류 전문가입니다. 다음 티켓 내용을 분석하여 카테고리, 우선순위, 담당 팀을 분류해주세요.

=== 티켓 내용 ===
제목: ${subject}
내용: ${description}

=== 분류 기준 ===

카테고리 (다음 중 하나 선택):
${categoryList}
- 해당하는 카테고리가 없으면 "null"을 선택하세요.

우선순위 (다음 중 하나 선택):
- URGENT: 시스템 다운, 데이터 유출, 보안 침해 등 즉시 대응 필요
- HIGH: 기능 장애, 심각한 버그, 업무 차단 문제
- MEDIUM: 일반적인 버그, 기능 개선 요청, 문의
- LOW: 단순 문의, 사소한 이슈, 개선 제안

담당 팀 (다음 중 하나 선택):
${teamList}
- 특정 팀에 할당할 필요가 없으면 "null"을 선택하세요.

=== 출력 형식 ===
다음 JSON 형식으로만 출력하세요. 설명이나 다른 텍스트 없이 JSON만 출력하세요.

{
  "categoryId": "카테고리 ID 또는 null",
  "priority": "URGENT|HIGH|MEDIUM|LOW",
  "teamId": "팀 ID 또는 null",
  "confidence": 0~1 사이의 신뢰도 점수,
  "reasoning": "분류 이유 (간단히)"
}`;

  try {
    const response = await runProvider(prompt, settings);
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // 결과 검증
    const result: ClassificationResult = {
      categoryId: parsed.categoryId || null,
      priority: parsed.priority || "MEDIUM",
      teamId: parsed.teamId || null,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5))
    };

    // 카테고리가 지정된 경우 존재하는지 확인
    if (result.categoryId) {
      const exists = availableCategories.some(c => c.id === result.categoryId);
      if (!exists) {
        result.categoryId = null;
      }
    }

    // 팀이 지정된 경우 존재하는지 확인
    if (result.teamId) {
      const exists = availableTeams.some(t => t.id === result.teamId);
      if (!exists) {
        result.teamId = null;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to classify ticket:", error);
    return null;
  }
}
