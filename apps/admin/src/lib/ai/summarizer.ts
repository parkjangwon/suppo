import type { LLMSettings } from "@prisma/client";
import { prisma } from "@suppo/db";
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

interface Comment {
  content: string;
  authorType: string;
  authorName: string;
  createdAt: Date;
}

export async function generateTicketSummary(
  subject: string,
  description: string,
  comments: Comment[]
): Promise<string | null> {
  const settings = await getLlmSettings();

  if (!settings.analysisEnabled) {
    return null;
  }

  // 고객 메시지만 추출
  const customerComments = comments
    .filter(c => c.authorType === "CUSTOMER")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const commentsText = customerComments.length > 0
    ? customerComments.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n")
    : "추가 대화 없음";

  const prompt = `당신은 티켓 요약 전문가입니다. 다음 티켓 내용을 간결하게 요약해주세요.

=== 티켓 정보 ===
제목: ${subject}

초기 문의 내용:
${description}

=== 고객 추가 메시지 ===
${commentsText}

=== 요청사항 ===
- 1~2문장으로 간결하게 요약해주세요.
- 주요 이슈를 중심으로 요약해주세요.
- 시도한 해결책이나 현재 상태를 포함해주세요.
- "고객은 ~", "문제는 ~" 형태로 작성해주세요.
- 한국어로 작성해주세요.
- 불필요한 설명 없이 요약만 출력하세요.

요약:`;

  try {
    const summary = await runProvider(prompt, settings);
    return summary.trim();
  } catch (error) {
    console.error("Failed to generate ticket summary:", error);
    return null;
  }
}

export async function updateTicketSummary(ticketId: string): Promise<void> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        comments: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!ticket) {
      return;
    }

    // 댓글이 없으면 초기 설명으로 요약 설정
    if (!ticket.comments || ticket.comments.length === 0) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          summary: ticket.description.substring(0, 200),
          summaryUpdatedAt: new Date()
        }
      });
      return;
    }

    const summary = await generateTicketSummary(
      ticket.subject,
      ticket.description,
      ticket.comments.map(c => ({
        content: c.content,
        authorType: c.authorType,
        authorName: c.authorName,
        createdAt: c.createdAt
      }))
    );

    if (summary) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          summary,
          summaryUpdatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error("Failed to update ticket summary:", error);
  }
}
