import type { Category, LLMSettings, Team, TicketPriority } from "@prisma/client";
import { prisma } from "@suppo/db";
import { callGemini, callOllama } from "./llm-providers";

const DEFAULT_SETTINGS_ID = "default";

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: { id: DEFAULT_SETTINGS_ID },
  });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  const signal = AbortSignal.timeout(3_000);

  if (provider === "ollama") {
    return callOllama(prompt, settings, signal);
  }

  if (provider === "gemini") {
    return callGemini(prompt, settings, signal);
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

  const categoryList = availableCategories
    .map((category) => `- ${category.id}: ${category.name}${category.description ? ` (${category.description})` : ""}`)
    .join("\n");
  const teamList = availableTeams
    .filter((team) => team.isActive)
    .map((team) => `- ${team.id}: ${team.name}${team.description ? ` (${team.description})` : ""}`)
    .join("\n");

  const prompt = `당신은 티켓 분류 전문가입니다. 다음 티켓 내용을 분석하여 카테고리, 우선순위, 담당 팀을 분류해주세요.

=== 티켓 내용 ===
제목: ${subject}
내용: ${description}

=== 분류 기준 ===

카테고리:
${categoryList}
- 적절한 카테고리가 없으면 "null"

우선순위:
- URGENT
- HIGH
- MEDIUM
- LOW

담당 팀:
${teamList}
- 적절한 팀이 없으면 "null"

=== 출력 형식 ===
{
  "categoryId": "카테고리 ID 또는 null",
  "priority": "URGENT|HIGH|MEDIUM|LOW",
  "teamId": "팀 ID 또는 null",
  "confidence": 0~1
}`;

  try {
    const response = await runProvider(prompt, settings);
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const result: ClassificationResult = {
      categoryId: parsed.categoryId || null,
      priority: parsed.priority || "MEDIUM",
      teamId: parsed.teamId || null,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
    };

    if (result.categoryId && !availableCategories.some((category) => category.id === result.categoryId)) {
      result.categoryId = null;
    }
    if (result.teamId && !availableTeams.some((team) => team.id === result.teamId)) {
      result.teamId = null;
    }

    return result;
  } catch (error) {
    console.error("Failed to classify ticket:", error);
    return null;
  }
}
