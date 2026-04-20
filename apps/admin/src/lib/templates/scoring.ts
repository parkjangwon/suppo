import { prisma } from "@suppo/db";
import { ResponseTemplate, Ticket, TicketStatus, TicketPriority, AuditAction } from "@prisma/client";

interface TemplateScore {
  template: ResponseTemplate;
  score: number;
  reasons: string[];
}

export async function calculateTemplateScores(
  templates: ResponseTemplate[],
  ticket: Ticket,
  agentId: string
): Promise<TemplateScore[]> {
  const scores: TemplateScore[] = [];

  for (const template of templates) {
    const { score, reasons } = await scoreTemplate(template, ticket, agentId);
    scores.push({ template, score, reasons });
  }

  return scores.sort((a, b) => b.score - a.score);
}

async function scoreTemplate(
  template: ResponseTemplate,
  ticket: Ticket,
  agentId: string
): Promise<{ score: number; reasons: string[] }> {
  let score = 0;
  const reasons: string[] = [];

  const t = template as any;

  if (t.requestTypeId && t.requestTypeId === ticket.requestTypeId) {
    score += 30;
    reasons.push("문의 유형 일치");
  }

  if (t.isRecommended) {
    score += 20;
    reasons.push("추천 템플릿");
  }

  if (t.categoryId && t.categoryId === ticket.categoryId) {
    score += 15;
    reasons.push("카테고리 일치");
  }

  const statusKeywords: Record<string, string[]> = {
    OPEN: ["신규", "접수", "open"],
    IN_PROGRESS: ["처리", "진행", "progress"],
    WAITING: ["대기", "보류", "wait"],
    RESOLVED: ["해결", "완료", "resolve"],
    CLOSED: ["종료", "close"],
  };

  const keywords = statusKeywords[ticket.status] || [];
  if (keywords.some(kw => template.title.toLowerCase().includes(kw.toLowerCase()))) {
    score += 10;
    reasons.push("상태 키워드 포함");
  }

  if (ticket.priority === TicketPriority.HIGH || ticket.priority === TicketPriority.URGENT) {
    if (template.title.includes("긴급")) {
      score += 10;
      reasons.push("긴급/높은 우선순위 관련");
    }
  }

  const recentlyUsed = await prisma.auditLog.findFirst({
    where: {
      actorId: agentId,
      resourceType: "response_template",
      resourceId: template.id,
      action: AuditAction.USE,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (recentlyUsed) {
    score += 5;
    reasons.push("최근 사용");
  }

  const usageCount = await prisma.auditLog.count({
    where: {
      resourceType: "response_template",
      resourceId: template.id,
      action: AuditAction.USE
    }
  });

  if (usageCount > 0 && usageCount < 10) {
    score += 5;
    reasons.push("적절한 사용 빈도");
  }

  return { score, reasons };
}

export function getTopRecommendations(
  scoredTemplates: TemplateScore[],
  limit = 5
): TemplateScore[] {
  return scoredTemplates.slice(0, limit);
}
