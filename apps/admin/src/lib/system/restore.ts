import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@suppo/db";
import { getUploadDir, isPathInside } from "@suppo/shared/storage/upload-config";

export class RestoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestoreValidationError";
  }
}

/**
 * 현재 스키마 버전을 파일시스템에서 직접 읽어옴.
 * Prisma Driver Adapter는 $queryRaw를 지원하지 않으므로 이 방식 사용.
 */
async function getLatestMigration(): Promise<string> {
  try {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    // YYYYMMDDHHMMSS_ 형식의 마이그레이션 디렉토리 필터링
    const migrationDirs = entries
      .filter(e => e.isDirectory() && /^\d{14}_/.test(e.name))
      .map(e => e.name)
      .sort();
    return migrationDirs.at(-1) ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** JSON 문자열의 ISO 날짜를 Date 객체로 변환 */
function dateReviver(_key: string, value: unknown): unknown {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    return new Date(value);
  }
  return value;
}

interface RestoreResult {
  schemaVersionMatch: boolean;
  backupSchemaVersion: string;
}

export const RESTORE_DELETE_ORDER = [
  "webhookDeliveryLog",
  "ticketKnowledgeLink",
  "knowledgeArticleFeedback",
  "chatEvent",
  "chatConversation",
  "knowledgeArticle",
  "knowledgeCategory",
  "generatedReport",
  "reportSchedule",
  "auditLog",
  "customerSatisfaction",
  "ticketMerge",
  "ticketTransfer",
  "ticketActivity",
  "ticketPresence",
  "ticketCommentLock",
  "timeEntry",
  "gitOperationQueue",
  "gitEvent",
  "gitLink",
  "emailDelivery",
  "emailThreadMapping",
  "comment",
  "attachment",
  "customFieldValue",
  "sLAClock",
  "ticket",
  "savedFilter",
  "publicApiKey",
  "webhookEndpoint",
  "macro",
  "agentAbsence",
  "agentCategory",
  "notificationSetting",
  "teamMember",
  "team",
  "agent",
  "customer",
  "automationRule",
  "sLAPolicy",
  "holiday",
  "businessCalendar",
  "customFieldDefinition",
  "responseTemplate",
  "requestType",
  "gitProviderCredential",
  "sAMLProvider",
  "systemBranding",
  "lLMSettings",
  "emailSettings",
  "chatWidgetProfile",
  "chatWidgetSettings",
  "category",
] as const;

export const RESTORE_INSERT_ORDER = [
  "category",
  "chatWidgetSettings",
  "chatWidgetProfile",
  "emailSettings",
  "lLMSettings",
  "systemBranding",
  "sAMLProvider",
  "gitProviderCredential",
  "customFieldDefinition",
  "businessCalendar",
  "holiday",
  "sLAPolicy",
  "automationRule",
  "customer",
  "agent",
  "team",
  "teamMember",
  "requestType",      // team(defaultTeamId FK), category(categoryId FK) 이후 삽입
  "responseTemplate", // requestType(requestTypeId FK), agent(createdById FK) 이후 삽입
  "notificationSetting",
  "agentCategory",
  "agentAbsence",
  "macro",
  "webhookEndpoint",
  "publicApiKey",
  "savedFilter",
  "ticket",
  "chatConversation",
  "sLAClock",
  "customFieldValue",
  "attachment",
  "comment",
  "emailThreadMapping",
  "emailDelivery",
  "gitLink",
  "gitEvent",
  "gitOperationQueue",
  "timeEntry",
  "ticketCommentLock",
  "ticketPresence",
  "ticketActivity",
  "ticketTransfer",
  "ticketMerge",
  "customerSatisfaction",
  "auditLog",
  "reportSchedule",
  "generatedReport",
  "knowledgeCategory",
  "knowledgeArticle",
  "ticketKnowledgeLink",
  "knowledgeArticleFeedback",
  "chatEvent",
  "webhookDeliveryLog",
] as const;

/** ZIP 버퍼로부터 DB + 첨부파일 전체 복구 */
export async function restoreFromZip(zipBuffer: Buffer): Promise<RestoreResult> {
  const uploadDir = getUploadDir();
  const zip = await JSZip.loadAsync(zipBuffer);

  // manifest 검증
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new RestoreValidationError("유효하지 않은 백업 파일: manifest.json 없음");
  const manifest = JSON.parse(await manifestFile.async("text"));
  if (manifest.version !== "1.0")
    throw new RestoreValidationError(`지원하지 않는 백업 버전: ${manifest.version}`);

  // 현재 스키마 버전
  const currentSchema = await getLatestMigration();
  const schemaVersionMatch = manifest.schemaVersion === currentSchema;

  // data/ 폴더의 모든 JSON 파일 파싱
  const data: Record<string, unknown[]> = {};
  const dataFolder = zip.folder("data");
  if (dataFolder) {
    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (
        relativePath.startsWith("data/") &&
        relativePath.endsWith(".json") &&
        !file.dir
      ) {
        const tableName = path.basename(relativePath, ".json");
        const content = await file.async("text");
        data[tableName] = JSON.parse(content, dateReviver) as unknown[];
      }
    }
  }

  const get = <T = unknown>(table: string): T[] =>
    (data[table] as T[]) ?? [];

  // FK-안전 순서로 전체 삭제 후 재삽입
  await prisma.$transaction(
    async (tx) => {
      const deleters: Record<string, () => Promise<unknown>> = {
        webhookDeliveryLog: () => tx.webhookDeliveryLog.deleteMany(),
        ticketKnowledgeLink: () => tx.ticketKnowledgeLink.deleteMany(),
        knowledgeArticleFeedback: () => tx.knowledgeArticleFeedback.deleteMany(),
        chatEvent: () => tx.chatEvent.deleteMany(),
        chatConversation: () => tx.chatConversation.deleteMany(),
        knowledgeArticle: () => tx.knowledgeArticle.deleteMany(),
        knowledgeCategory: () => tx.knowledgeCategory.deleteMany(),
        generatedReport: () => tx.generatedReport.deleteMany(),
        reportSchedule: () => tx.reportSchedule.deleteMany(),
        auditLog: () => tx.auditLog.deleteMany(),
        customerSatisfaction: () => tx.customerSatisfaction.deleteMany(),
        ticketMerge: () => tx.ticketMerge.deleteMany(),
        ticketTransfer: () => tx.ticketTransfer.deleteMany(),
        ticketActivity: () => tx.ticketActivity.deleteMany(),
        ticketPresence: () => tx.ticketPresence.deleteMany(),
        ticketCommentLock: () => tx.ticketCommentLock.deleteMany(),
        timeEntry: () => tx.timeEntry.deleteMany(),
        gitOperationQueue: () => tx.gitOperationQueue.deleteMany(),
        gitEvent: () => tx.gitEvent.deleteMany(),
        gitLink: () => tx.gitLink.deleteMany(),
        emailDelivery: () => tx.emailDelivery.deleteMany(),
        emailThreadMapping: () => tx.emailThreadMapping.deleteMany(),
        comment: () => tx.comment.deleteMany(),
        attachment: () => tx.attachment.deleteMany(),
        customFieldValue: () => tx.customFieldValue.deleteMany(),
        sLAClock: () => tx.sLAClock.deleteMany(),
        ticket: () => tx.ticket.deleteMany(),
        savedFilter: () => tx.savedFilter.deleteMany(),
        publicApiKey: () => tx.publicApiKey.deleteMany(),
        webhookEndpoint: () => tx.webhookEndpoint.deleteMany(),
        macro: () => tx.macro.deleteMany(),
        agentAbsence: () => tx.agentAbsence.deleteMany(),
        agentCategory: () => tx.agentCategory.deleteMany(),
        notificationSetting: () => tx.notificationSetting.deleteMany(),
        teamMember: () => tx.teamMember.deleteMany(),
        team: () => tx.team.deleteMany(),
        agent: () => tx.agent.deleteMany(),
        customer: () => tx.customer.deleteMany(),
        automationRule: () => tx.automationRule.deleteMany(),
        sLAPolicy: () => tx.sLAPolicy.deleteMany(),
        holiday: () => tx.holiday.deleteMany(),
        businessCalendar: () => tx.businessCalendar.deleteMany(),
        customFieldDefinition: () => tx.customFieldDefinition.deleteMany(),
        responseTemplate: () => tx.responseTemplate.deleteMany(),
        requestType: () => tx.requestType.deleteMany(),
        gitProviderCredential: () => tx.gitProviderCredential.deleteMany(),
        sAMLProvider: () => tx.sAMLProvider.deleteMany(),
        systemBranding: () => tx.systemBranding.deleteMany(),
        lLMSettings: () => tx.lLMSettings.deleteMany(),
        emailSettings: () => tx.emailSettings.deleteMany(),
        chatWidgetProfile: () => tx.chatWidgetProfile.deleteMany(),
        chatWidgetSettings: () => tx.chatWidgetSettings.deleteMany(),
        category: () => tx.category.deleteMany(),
      };

      for (const table of RESTORE_DELETE_ORDER) {
        await deleters[table]();
      }

      const inserters: Record<string, () => Promise<unknown>> = {
        category: () => get("category").length ? tx.category.createMany({ data: get("category") as never }) : Promise.resolve(),
        chatWidgetSettings: () => get("chatWidgetSettings").length ? tx.chatWidgetSettings.createMany({ data: get("chatWidgetSettings") as never }) : Promise.resolve(),
        chatWidgetProfile: () => get("chatWidgetProfile").length ? tx.chatWidgetProfile.createMany({ data: get("chatWidgetProfile") as never }) : Promise.resolve(),
        emailSettings: () => get("emailSettings").length ? tx.emailSettings.createMany({ data: get("emailSettings") as never }) : Promise.resolve(),
        lLMSettings: () => get("lLMSettings").length ? tx.lLMSettings.createMany({ data: get("lLMSettings") as never }) : Promise.resolve(),
        systemBranding: () => get("systemBranding").length ? tx.systemBranding.createMany({ data: get("systemBranding") as never }) : Promise.resolve(),
        sAMLProvider: () => get("sAMLProvider").length ? tx.sAMLProvider.createMany({ data: get("sAMLProvider") as never }) : Promise.resolve(),
        gitProviderCredential: () => get("gitProviderCredential").length ? tx.gitProviderCredential.createMany({ data: get("gitProviderCredential") as never }) : Promise.resolve(),
        requestType: () => get("requestType").length ? tx.requestType.createMany({ data: get("requestType") as never }) : Promise.resolve(),
        responseTemplate: () => get("responseTemplate").length ? tx.responseTemplate.createMany({ data: get("responseTemplate") as never }) : Promise.resolve(),
        customFieldDefinition: () => get("customFieldDefinition").length ? tx.customFieldDefinition.createMany({ data: get("customFieldDefinition") as never }) : Promise.resolve(),
        businessCalendar: () => get("businessCalendar").length ? tx.businessCalendar.createMany({ data: get("businessCalendar") as never }) : Promise.resolve(),
        holiday: () => get("holiday").length ? tx.holiday.createMany({ data: get("holiday") as never }) : Promise.resolve(),
        sLAPolicy: () => get("sLAPolicy").length ? tx.sLAPolicy.createMany({ data: get("sLAPolicy") as never }) : Promise.resolve(),
        automationRule: () => get("automationRule").length ? tx.automationRule.createMany({ data: get("automationRule") as never }) : Promise.resolve(),
        customer: () => get("customer").length ? tx.customer.createMany({ data: get("customer") as never }) : Promise.resolve(),
        agent: () => get("agent").length ? tx.agent.createMany({ data: get("agent") as never }) : Promise.resolve(),
        team: () => get("team").length ? tx.team.createMany({ data: get("team") as never }) : Promise.resolve(),
        teamMember: () => get("teamMember").length ? tx.teamMember.createMany({ data: get("teamMember") as never }) : Promise.resolve(),
        notificationSetting: () => get("notificationSetting").length ? tx.notificationSetting.createMany({ data: get("notificationSetting") as never }) : Promise.resolve(),
        agentCategory: () => get("agentCategory").length ? tx.agentCategory.createMany({ data: get("agentCategory") as never }) : Promise.resolve(),
        agentAbsence: () => get("agentAbsence").length ? tx.agentAbsence.createMany({ data: get("agentAbsence") as never }) : Promise.resolve(),
        macro: () => get("macro").length ? tx.macro.createMany({ data: get("macro") as never }) : Promise.resolve(),
        webhookEndpoint: () => get("webhookEndpoint").length ? tx.webhookEndpoint.createMany({ data: get("webhookEndpoint") as never }) : Promise.resolve(),
        publicApiKey: () => get("publicApiKey").length ? tx.publicApiKey.createMany({ data: get("publicApiKey") as never }) : Promise.resolve(),
        savedFilter: () => get("savedFilter").length ? tx.savedFilter.createMany({ data: get("savedFilter") as never }) : Promise.resolve(),
        ticket: () => get("ticket").length ? tx.ticket.createMany({ data: get("ticket") as never }) : Promise.resolve(),
        chatConversation: () => get("chatConversation").length ? tx.chatConversation.createMany({ data: get("chatConversation") as never }) : Promise.resolve(),
        sLAClock: () => get("sLAClock").length ? tx.sLAClock.createMany({ data: get("sLAClock") as never }) : Promise.resolve(),
        customFieldValue: () => get("customFieldValue").length ? tx.customFieldValue.createMany({ data: get("customFieldValue") as never }) : Promise.resolve(),
        attachment: () => get("attachment").length ? tx.attachment.createMany({ data: get("attachment") as never }) : Promise.resolve(),
        comment: () => get("comment").length ? tx.comment.createMany({ data: get("comment") as never }) : Promise.resolve(),
        emailThreadMapping: () => get("emailThreadMapping").length ? tx.emailThreadMapping.createMany({ data: get("emailThreadMapping") as never }) : Promise.resolve(),
        emailDelivery: () => get("emailDelivery").length ? tx.emailDelivery.createMany({ data: get("emailDelivery") as never }) : Promise.resolve(),
        gitLink: () => get("gitLink").length ? tx.gitLink.createMany({ data: get("gitLink") as never }) : Promise.resolve(),
        gitEvent: () => get("gitEvent").length ? tx.gitEvent.createMany({ data: get("gitEvent") as never }) : Promise.resolve(),
        gitOperationQueue: () => get("gitOperationQueue").length ? tx.gitOperationQueue.createMany({ data: get("gitOperationQueue") as never }) : Promise.resolve(),
        timeEntry: () => get("timeEntry").length ? tx.timeEntry.createMany({ data: get("timeEntry") as never }) : Promise.resolve(),
        ticketCommentLock: () => get("ticketCommentLock").length ? tx.ticketCommentLock.createMany({ data: get("ticketCommentLock") as never }) : Promise.resolve(),
        ticketPresence: () => get("ticketPresence").length ? tx.ticketPresence.createMany({ data: get("ticketPresence") as never }) : Promise.resolve(),
        ticketActivity: () => get("ticketActivity").length ? tx.ticketActivity.createMany({ data: get("ticketActivity") as never }) : Promise.resolve(),
        ticketTransfer: () => get("ticketTransfer").length ? tx.ticketTransfer.createMany({ data: get("ticketTransfer") as never }) : Promise.resolve(),
        ticketMerge: () => get("ticketMerge").length ? tx.ticketMerge.createMany({ data: get("ticketMerge") as never }) : Promise.resolve(),
        customerSatisfaction: () => get("customerSatisfaction").length ? tx.customerSatisfaction.createMany({ data: get("customerSatisfaction") as never }) : Promise.resolve(),
        auditLog: () => get("auditLog").length ? tx.auditLog.createMany({ data: get("auditLog") as never }) : Promise.resolve(),
        reportSchedule: () => get("reportSchedule").length ? tx.reportSchedule.createMany({ data: get("reportSchedule") as never }) : Promise.resolve(),
        generatedReport: () => get("generatedReport").length ? tx.generatedReport.createMany({ data: get("generatedReport") as never }) : Promise.resolve(),
        knowledgeCategory: () => get("knowledgeCategory").length ? tx.knowledgeCategory.createMany({ data: get("knowledgeCategory") as never }) : Promise.resolve(),
        knowledgeArticle: () => get("knowledgeArticle").length ? tx.knowledgeArticle.createMany({ data: get("knowledgeArticle") as never }) : Promise.resolve(),
        ticketKnowledgeLink: () => get("ticketKnowledgeLink").length ? tx.ticketKnowledgeLink.createMany({ data: get("ticketKnowledgeLink") as never }) : Promise.resolve(),
        knowledgeArticleFeedback: () => get("knowledgeArticleFeedback").length ? tx.knowledgeArticleFeedback.createMany({ data: get("knowledgeArticleFeedback") as never }) : Promise.resolve(),
        chatEvent: () => get("chatEvent").length ? tx.chatEvent.createMany({ data: get("chatEvent") as never }) : Promise.resolve(),
        webhookDeliveryLog: () => get("webhookDeliveryLog").length ? tx.webhookDeliveryLog.createMany({ data: get("webhookDeliveryLog") as never }) : Promise.resolve(),
      };

      for (const table of RESTORE_INSERT_ORDER) {
        await inserters[table]();
      }
    },
    { timeout: 60000 }
  );

  // 첨부파일 교체: uploadDir 내부에 스테이징 디렉토리 생성 (부모 디렉토리 쓰기 권한 불필요)
  const stagingDir = path.join(uploadDir, ".restore_staging");

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.rm(stagingDir, { recursive: true, force: true });
  await fs.mkdir(stagingDir, { recursive: true });

  // ZIP의 attachments/ → stagingDir 추출
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (relativePath.startsWith("attachments/") && !file.dir) {
      const relPath = relativePath.replace(/^attachments\//, "");
      const destPath = path.resolve(stagingDir, relPath);
      if (!isPathInside(destPath, stagingDir)) continue;
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const content = await file.async("nodebuffer");
      await fs.writeFile(destPath, content);
    }
  }

  // 기존 파일 제거 후 스테이징 내용으로 교체
  const existing = await fs.readdir(uploadDir).catch(() => [] as string[]);
  for (const entry of existing) {
    if (entry === ".restore_staging") continue;
    await fs.rm(path.join(uploadDir, entry), { recursive: true, force: true });
  }
  const staged = await fs.readdir(stagingDir).catch(() => [] as string[]);
  for (const entry of staged) {
    await fs.rename(path.join(stagingDir, entry), path.join(uploadDir, entry));
  }
  await fs.rm(stagingDir, { recursive: true, force: true });

  return { schemaVersionMatch, backupSchemaVersion: manifest.schemaVersion };
}
