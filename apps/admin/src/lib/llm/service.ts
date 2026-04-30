import type { LLMSettings, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "@suppo/db";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

const DEFAULT_SETTINGS_ID = "default";

const DEFAULT_ANALYSIS_INSTRUCTIONS =
  "이 고객의 문의 패턴, 주요 이슈, 우선순위 경향, 전반적인 특성을 분석해주세요.";

type CustomerAnalysisComment = {
  authorType: string;
  authorName: string;
  authorEmail: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
};

type CustomerAnalysisAttachment = {
  fileName: string;
  mimeType: string;
  fileSize: number;
};

type CustomerAnalysisTicket = {
  ticketNumber: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: string;
  customerOrganization: string | null;
  environment: string | null;
  serviceModule: string | null;
  reopenedCount: number;
  summary: string | null;
  tags: string[] | null;
  createdAt: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  category: { name: string } | null;
  requestType: { name: string } | null;
  team: { name: string } | null;
  assignee: { name: string; email: string } | null;
  comments: CustomerAnalysisComment[];
  attachments: CustomerAnalysisAttachment[];
};

type CustomerAnalysisProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  memo: string | null;
  ticketCount: number;
  lastTicketAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organization: string | null;
};

export interface CustomerAnalysisInput {
  customer: CustomerAnalysisProfile;
  tickets: CustomerAnalysisTicket[];
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "없음";
  }

  return value.toISOString();
}

function truncateText(value: string | null | undefined, maxLength: number): string {
  if (!value) {
    return "없음";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function formatTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) {
    return "없음";
  }
  return tags.join(", ");
}

function summarizeTicketStats(tickets: CustomerAnalysisTicket[]): string {
  const statusCounts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
    return acc;
  }, {});

  const priorityCounts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.priority] = (acc[ticket.priority] ?? 0) + 1;
    return acc;
  }, {});

  const categoryCounts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    const key = ticket.category?.name ?? "미분류";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return [
    `상태 분포: ${Object.entries(statusCounts)
      .map(([status, count]) => `${status} ${count}건`)
      .join(", ") || "없음"}`,
    `우선순위 분포: ${Object.entries(priorityCounts)
      .map(([priority, count]) => `${priority} ${count}건`)
      .join(", ") || "없음"}`,
    `카테고리 분포: ${Object.entries(categoryCounts)
      .map(([category, count]) => `${category} ${count}건`)
      .join(", ") || "없음"}`,
  ].join("\n");
}

function formatComments(comments: CustomerAnalysisComment[]): string {
  if (comments.length === 0) {
    return "댓글 없음";
  }

  return comments
    .map((comment, index) => {
      return [
        `  - 댓글 ${index + 1}`,
        `    작성자: ${comment.authorName} (${comment.authorType}${comment.isInternal ? ", 내부 메모" : ""})`,
        `    이메일: ${comment.authorEmail}`,
        `    작성일: ${formatDateTime(comment.createdAt)}`,
        `    내용: ${truncateText(comment.content, 600)}`,
      ].join("\n");
    })
    .join("\n");
}

function formatAttachments(attachments: CustomerAnalysisAttachment[]): string {
  if (attachments.length === 0) {
    return "첨부 없음";
  }

  return attachments
    .map((attachment) => `${attachment.fileName} (${attachment.mimeType}, ${attachment.fileSize} bytes)`)
    .join(", ");
}

function formatTicketHistory(tickets: CustomerAnalysisTicket[]): string {
  if (tickets.length === 0) {
    return "티켓 이력이 없습니다.";
  }

  return tickets
    .map((ticket, index) => {
      return [
        `[티켓 ${index + 1}]`,
        `티켓번호: ${ticket.ticketNumber}`,
        `제목: ${ticket.subject}`,
        `설명: ${truncateText(ticket.description, 1200)}`,
        `요약: ${truncateText(ticket.summary, 600)}`,
        `카테고리: ${ticket.category?.name ?? "없음"}`,
        `요청유형: ${ticket.requestType?.name ?? "없음"}`,
        `팀: ${ticket.team?.name ?? "없음"}`,
        `담당자: ${ticket.assignee ? `${ticket.assignee.name} (${ticket.assignee.email})` : "미배정"}`,
        `우선순위: ${ticket.priority}`,
        `상태: ${ticket.status}`,
        `유입 채널: ${ticket.source}`,
        `고객 소속: ${ticket.customerOrganization ?? "없음"}`,
        `환경: ${ticket.environment ?? "없음"}`,
        `서비스 모듈: ${ticket.serviceModule ?? "없음"}`,
        `재오픈 횟수: ${ticket.reopenedCount}`,
        `태그: ${formatTags(ticket.tags)}`,
        `생성일: ${formatDateTime(ticket.createdAt)}`,
        `첫 응답일: ${formatDateTime(ticket.firstResponseAt)}`,
        `해결일: ${formatDateTime(ticket.resolvedAt)}`,
        `종료일: ${formatDateTime(ticket.closedAt)}`,
        `첨부파일: ${formatAttachments(ticket.attachments)}`,
        `댓글 이력:\n${formatComments(ticket.comments)}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildPrompt(
  customInstructions: string | null,
  analysisInput: CustomerAnalysisInput,
): string {
  const ticketText = formatTicketHistory(analysisInput.tickets);
  const instructions = customInstructions?.trim() || DEFAULT_ANALYSIS_INSTRUCTIONS;
  const { customer, tickets } = analysisInput;

  return `다음은 고객 상세 정보와 전체 티켓 이력입니다. 고객 프로필, 관리자 메모, 티켓 메타데이터, 댓글/내부 메모를 모두 고려해서 분석해주세요.

고객 프로필:
- 고객 ID: ${customer.id}
- 이름: ${customer.name}
- 이메일: ${customer.email}
- 전화번호: ${customer.phone ?? "없음"}
- 소속/조직: ${customer.organization ?? "없음"}
- 총 티켓 수: ${customer.ticketCount}
- 마지막 티켓 일시: ${formatDateTime(customer.lastTicketAt)}
- 고객 생성일: ${formatDateTime(customer.createdAt)}
- 고객 정보 수정일: ${formatDateTime(customer.updatedAt)}
- 관리자 메모: ${truncateText(customer.memo, 1500)}

고객 티켓 통계:
${summarizeTicketStats(tickets)}

티켓 목록:
${ticketText}

분석 지침:
- 관리자 메모와 내부 댓글은 운영 맥락/주의사항으로 해석하세요.
- 반복되는 문제, 고객의 요구 수준, 긴급도 변화, 선호 채널, 조직/권한 관련 요청 패턴을 파악하세요.
- 현재 미해결 이슈와 장기적으로 재발 가능성이 있는 문제를 구분하세요.
- 지원팀이 다음 대응에서 참고해야 할 포인트를 구체적으로 제시하세요.

${instructions}

분석 결과:`;
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

export async function analyzeCustomer(
  analysisInput: CustomerAnalysisInput,
): Promise<string | null> {
  const settings = await getLlmSettings();

  if (!settings.analysisEnabled) {
    return null;
  }

  const prompt = buildPrompt(settings.analysisPrompt, analysisInput);
  const analysis = await runProvider(prompt, settings);

  await prisma.customer.update({
    where: { id: analysisInput.customer.id },
    data: {
      analysis,
      analyzedAt: new Date()
    }
  });

  return analysis;
}
