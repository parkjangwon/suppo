import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  seedInitialAdmin,
  seedDefaultCategories,
} from "@/lib/system/seed-functions";

export type ResetCategory =
  | "tickets"
  | "agents"
  | "settings"
  | "knowledge"
  | "audit_logs";

/** FK 제약 규칙: key 선택 시 value도 반드시 포함되어야 함 */
export const RESET_DEPENDENCIES: Record<ResetCategory, ResetCategory[]> = {
  agents: ["tickets", "knowledge", "settings"],
  settings: ["tickets"],
  tickets: [],
  knowledge: [],
  audit_logs: [],
};

/** 카테고리 선택 유효성 검사 */
export function validateResetCategories(categories: ResetCategory[]): string | null {
  const set = new Set(categories);
  for (const [cat, deps] of Object.entries(RESET_DEPENDENCIES) as [
    ResetCategory,
    ResetCategory[]
  ][]) {
    if (set.has(cat)) {
      for (const dep of deps) {
        if (!set.has(dep)) {
          return `'${cat}' 초기화 시 '${dep}'도 함께 선택해야 합니다.`;
        }
      }
    }
  }
  return null;
}

/** 선택된 카테고리를 초기화하고 필요한 시드를 재실행 */
export async function resetCategories(
  categories: ResetCategory[]
): Promise<void> {
  const set = new Set(categories);

  await prisma.$transaction(
    async (tx) => {
      // ── knowledge ───────────────────────────────────────────
      if (set.has("knowledge")) {
        await tx.knowledgeArticleFeedback.deleteMany();
        await tx.knowledgeArticle.deleteMany();
        await tx.knowledgeCategory.deleteMany();
      }

      // ── audit_logs ──────────────────────────────────────────
      if (set.has("audit_logs")) {
        await tx.generatedReport.deleteMany();
        await tx.reportSchedule.deleteMany();
        await tx.auditLog.deleteMany();
      }

      // ── tickets ─────────────────────────────────────────────
      if (set.has("tickets")) {
        await tx.customerSatisfaction.deleteMany();
        await tx.ticketMerge.deleteMany();
        await tx.ticketTransfer.deleteMany();
        await tx.ticketActivity.deleteMany();
        await tx.ticketPresence.deleteMany();
        await tx.ticketCommentLock.deleteMany();
        await tx.timeEntry.deleteMany();
        await tx.gitOperationQueue.deleteMany();
        await tx.gitEvent.deleteMany();
        await tx.gitLink.deleteMany();
        await tx.emailDelivery.deleteMany();
        await tx.emailThreadMapping.deleteMany();
        await tx.comment.deleteMany();
        await tx.attachment.deleteMany();
        await tx.customFieldValue.deleteMany();
        await tx.sLAClock.deleteMany();
        await tx.ticket.deleteMany();
        await tx.customer.deleteMany();
      }

      // ── settings ────────────────────────────────────────────
      // (agents 전에 먼저 삭제 필요 — responseTemplate.createdById → Agent FK)
      if (set.has("settings")) {
        await tx.notificationSetting.deleteMany(); // global key-value store
        await tx.automationRule.deleteMany();
        await tx.sLAPolicy.deleteMany();
        await tx.holiday.deleteMany();
        await tx.businessCalendar.deleteMany();
        await tx.customFieldDefinition.deleteMany();
        await tx.responseTemplate.deleteMany();
        await tx.requestType.deleteMany();
        await tx.gitProviderCredential.deleteMany();
        await tx.sAMLProvider.deleteMany();
        await tx.systemBranding.deleteMany();
        await tx.lLMSettings.deleteMany();
        await tx.emailSettings.deleteMany();
        await tx.category.deleteMany();
      }

      // ── agents ──────────────────────────────────────────────
      // (tickets + settings 먼저 삭제 필요 — FK dependency에서 강제됨)
      if (set.has("agents")) {
        await tx.savedFilter.deleteMany();
        await tx.agentAbsence.deleteMany();
        await tx.agentCategory.deleteMany();
        await tx.teamMember.deleteMany();
        await tx.team.deleteMany();
        // 전체 삭제 (초기 admin은 이후 seedInitialAdmin에서 재생성)
        await tx.agent.deleteMany();
      }
    },
    { timeout: 30000 }
  );

  // 트랜잭션 밖에서 시드 재실행 (upsert 사용)
  const prismaClient = prisma as unknown as PrismaClient;
  if (set.has("settings")) {
    await seedDefaultCategories(prismaClient);
  }
  if (set.has("agents")) {
    await seedInitialAdmin(prismaClient);
  }
}
