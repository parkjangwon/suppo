import type { LLMSettings, Ticket } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

const DEFAULT_SETTINGS_ID = "default";

const DEFAULT_PROMPT_TEMPLATE =
  "다음은 고객의 티켓 히스토리입니다. 이 고객의 문의 패턴, 주요 이슈, 우선순위 경향, 전반적인 특성을 분석해주세요.\n\n티켓 목록:\n{tickets}\n\n분석 결과:";

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "없음";
  }

  return value.toISOString();
}

function formatTicketHistory(tickets: Ticket[]): string {
  if (tickets.length === 0) {
    return "티켓 이력이 없습니다.";
  }

  return tickets
    .map((ticket, index) => {
      return [
        `[${index + 1}]`,
        `티켓번호: ${ticket.ticketNumber}`,
        `제목: ${ticket.subject}`,
        `설명: ${ticket.description}`,
        `카테고리 ID: ${ticket.categoryId}`,
        `우선순위: ${ticket.priority}`,
        `상태: ${ticket.status}`,
        `생성일: ${formatDateTime(ticket.createdAt)}`,
        `해결일: ${formatDateTime(ticket.resolvedAt)}`
      ].join("\n");
    })
    .join("\n\n");
}

function buildPrompt(template: string | null, tickets: Ticket[]): string {
  const promptTemplate = template?.trim() || DEFAULT_PROMPT_TEMPLATE;
  const ticketText = formatTicketHistory(tickets);

  return promptTemplate.replace("{tickets}", ticketText);
}

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

export async function analyzeCustomer(customerId: string, tickets: Ticket[]): Promise<string | null> {
  const settings = await getLlmSettings();

  if (!settings.analysisEnabled) {
    return null;
  }

  const prompt = buildPrompt(settings.analysisPrompt, tickets);
  const analysis = await runProvider(prompt, settings);

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      analysis,
      analyzedAt: new Date()
    }
  });

  return analysis;
}
