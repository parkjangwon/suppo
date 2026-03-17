import type { LLMSettings } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

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

interface SuggestionInput {
  customerName: string;
  customerEmail: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category?: string | null;
  requestType?: string | null;
  priority?: string;
  comments?: Array<{ content: string; authorType: string; createdAt: Date }>;
}

export async function generateResponseSuggestion(input: SuggestionInput): Promise<string | null> {
  const settings = await getLlmSettings();

  if (!settings.analysisEnabled) {
    return null;
  }

  const commentsText = input.comments && input.comments.length > 0
    ? input.comments
      .filter(c => c.authorType === "CUSTOMER")
      .map(c => `- ${c.content}`)
      .join("\n")
    : "없음";

  const prompt = `당신은 고객 지원 상담원입니다. 고객 문의에 대한 적절한 응대를 작성해주세요.

=== 고객 정보 ===
이름: ${input.customerName}
이메일: ${input.customerEmail}

=== 티켓 정보 ===
티켓 번호: ${input.ticketNumber}
제목: ${input.subject}
내용: ${input.description}
${input.category ? `카테고리: ${input.category}` : ""}
${input.requestType ? `문의 유형: ${input.requestType}` : ""}
${input.priority ? `우선순위: ${input.priority}` : ""}

=== 추가 대화 내용 (고객) ===
${commentsText}

=== 요청사항 ===
- 친절하고 전문적인 어조로 작성해주세요.
- 고객의 문제를 이해하고 있다는 것을 보여주세요.
- 해결 방법이나 다음 단계를 명확히 안내해주세요.
- 서명이나 문구 없이 응대 내용만 작성해주세요.
- 한국어로 작성해주세요.

응대:`;

  try {
    const suggestion = await runProvider(prompt, settings);
    return suggestion.trim();
  } catch (error) {
    console.error("Failed to generate response suggestion:", error);
    return null;
  }
}
