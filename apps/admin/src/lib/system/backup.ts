import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@suppo/db";
import { getUploadDir } from "@suppo/shared/storage/upload-config";

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

/** BigInt를 문자열로 직렬화 (SQLite에서 BigInt 필드가 있을 경우 대비) */
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** 디렉토리를 JSZip 폴더에 재귀적으로 추가 */
async function addDirToZip(
  zipFolder: JSZip,
  dirPath: string
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = zipFolder.folder(entry.name)!;
        await addDirToZip(sub, fullPath);
      } else {
        const content = await fs.readFile(fullPath);
        zipFolder.file(entry.name, content);
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
    // ENOENT: 디렉토리 없음 → 정상적으로 건너뜀
  }
}

type BackupReader = () => Promise<unknown[]>;

export const BACKUP_TABLE_READERS: Record<string, BackupReader> = {
  category: () => prisma.category.findMany(),
  agent: () => prisma.agent.findMany(),
  agentAbsence: () => prisma.agentAbsence.findMany(),
  agentCategory: () => prisma.agentCategory.findMany(),
  auditLog: () => prisma.auditLog.findMany(),
  attachment: () => prisma.attachment.findMany(),
  automationRule: () => prisma.automationRule.findMany(),
  businessCalendar: () => prisma.businessCalendar.findMany(),
  chatConversation: () => prisma.chatConversation.findMany(),
  chatEvent: () => prisma.chatEvent.findMany(),
  chatWidgetProfile: () => prisma.chatWidgetProfile.findMany(),
  chatWidgetSettings: () => prisma.chatWidgetSettings.findMany(),
  comment: () => prisma.comment.findMany(),
  customFieldDefinition: () => prisma.customFieldDefinition.findMany(),
  customFieldValue: () => prisma.customFieldValue.findMany(),
  customer: () => prisma.customer.findMany(),
  customerSatisfaction: () => prisma.customerSatisfaction.findMany(),
  emailDelivery: () => prisma.emailDelivery.findMany(),
  emailSettings: () => prisma.emailSettings.findMany(),
  emailThreadMapping: () => prisma.emailThreadMapping.findMany(),
  generatedReport: () => prisma.generatedReport.findMany(),
  gitEvent: () => prisma.gitEvent.findMany(),
  gitLink: () => prisma.gitLink.findMany(),
  gitOperationQueue: () => prisma.gitOperationQueue.findMany(),
  gitProviderCredential: () => prisma.gitProviderCredential.findMany(),
  holiday: () => prisma.holiday.findMany(),
  knowledgeArticle: () => prisma.knowledgeArticle.findMany(),
  knowledgeArticleFeedback: () => prisma.knowledgeArticleFeedback.findMany(),
  knowledgeCategory: () => prisma.knowledgeCategory.findMany(),
  lLMSettings: () => prisma.lLMSettings.findMany(),
  macro: () => prisma.macro.findMany(),
  notificationSetting: () => prisma.notificationSetting.findMany(),
  publicApiKey: () => prisma.publicApiKey.findMany(),
  reportSchedule: () => prisma.reportSchedule.findMany(),
  requestType: () => prisma.requestType.findMany(),
  responseTemplate: () => prisma.responseTemplate.findMany(),
  sAMLProvider: () => prisma.sAMLProvider.findMany(),
  sLAClock: () => prisma.sLAClock.findMany(),
  sLAPolicy: () => prisma.sLAPolicy.findMany(),
  savedFilter: () => prisma.savedFilter.findMany(),
  systemBranding: () => prisma.systemBranding.findMany(),
  team: () => prisma.team.findMany(),
  teamMember: () => prisma.teamMember.findMany(),
  ticket: () => prisma.ticket.findMany(),
  ticketActivity: () => prisma.ticketActivity.findMany(),
  ticketCommentLock: () => prisma.ticketCommentLock.findMany(),
  ticketKnowledgeLink: () => prisma.ticketKnowledgeLink.findMany(),
  ticketMerge: () => prisma.ticketMerge.findMany(),
  ticketPresence: () => prisma.ticketPresence.findMany(),
  ticketTransfer: () => prisma.ticketTransfer.findMany(),
  timeEntry: () => prisma.timeEntry.findMany(),
  webhookDeliveryLog: () => prisma.webhookDeliveryLog.findMany(),
  webhookEndpoint: () => prisma.webhookEndpoint.findMany(),
};

/** 전체 DB + 첨부파일을 ZIP 버퍼로 반환 */
export async function createBackupZip(): Promise<Buffer> {
  // 단일 트랜잭션으로 일관된 스냅샷 확보
  const allData = await prisma.$transaction(async (tx) => {
    const readers: Record<string, () => Promise<unknown[]>> = {
      category: () => tx.category.findMany(),
      agent: () => tx.agent.findMany(),
      agentAbsence: () => tx.agentAbsence.findMany(),
      agentCategory: () => tx.agentCategory.findMany(),
      auditLog: () => tx.auditLog.findMany(),
      attachment: () => tx.attachment.findMany(),
      automationRule: () => tx.automationRule.findMany(),
      businessCalendar: () => tx.businessCalendar.findMany(),
      chatConversation: () => tx.chatConversation.findMany(),
      chatEvent: () => tx.chatEvent.findMany(),
      chatWidgetProfile: () => tx.chatWidgetProfile.findMany(),
      chatWidgetSettings: () => tx.chatWidgetSettings.findMany(),
      comment: () => tx.comment.findMany(),
      customFieldDefinition: () => tx.customFieldDefinition.findMany(),
      customFieldValue: () => tx.customFieldValue.findMany(),
      customer: () => tx.customer.findMany(),
      customerSatisfaction: () => tx.customerSatisfaction.findMany(),
      emailDelivery: () => tx.emailDelivery.findMany(),
      emailSettings: () => tx.emailSettings.findMany(),
      emailThreadMapping: () => tx.emailThreadMapping.findMany(),
      generatedReport: () => tx.generatedReport.findMany(),
      gitEvent: () => tx.gitEvent.findMany(),
      gitLink: () => tx.gitLink.findMany(),
      gitOperationQueue: () => tx.gitOperationQueue.findMany(),
      gitProviderCredential: () => tx.gitProviderCredential.findMany(),
      holiday: () => tx.holiday.findMany(),
      knowledgeArticle: () => tx.knowledgeArticle.findMany(),
      knowledgeArticleFeedback: () => tx.knowledgeArticleFeedback.findMany(),
      knowledgeCategory: () => tx.knowledgeCategory.findMany(),
      lLMSettings: () => tx.lLMSettings.findMany(),
      macro: () => tx.macro.findMany(),
      notificationSetting: () => tx.notificationSetting.findMany(),
      publicApiKey: () => tx.publicApiKey.findMany(),
      reportSchedule: () => tx.reportSchedule.findMany(),
      requestType: () => tx.requestType.findMany(),
      responseTemplate: () => tx.responseTemplate.findMany(),
      sAMLProvider: () => tx.sAMLProvider.findMany(),
      sLAClock: () => tx.sLAClock.findMany(),
      sLAPolicy: () => tx.sLAPolicy.findMany(),
      savedFilter: () => tx.savedFilter.findMany(),
      systemBranding: () => tx.systemBranding.findMany(),
      team: () => tx.team.findMany(),
      teamMember: () => tx.teamMember.findMany(),
      ticket: () => tx.ticket.findMany(),
      ticketActivity: () => tx.ticketActivity.findMany(),
      ticketCommentLock: () => tx.ticketCommentLock.findMany(),
      ticketKnowledgeLink: () => tx.ticketKnowledgeLink.findMany(),
      ticketMerge: () => tx.ticketMerge.findMany(),
      ticketPresence: () => tx.ticketPresence.findMany(),
      ticketTransfer: () => tx.ticketTransfer.findMany(),
      timeEntry: () => tx.timeEntry.findMany(),
      webhookDeliveryLog: () => tx.webhookDeliveryLog.findMany(),
      webhookEndpoint: () => tx.webhookEndpoint.findMany(),
    };

    return Object.fromEntries(
      await Promise.all(
        Object.entries(readers).map(async ([table, reader]) => [table, await reader()]),
      ),
    );
  });

  // 스키마 버전 (최신 마이그레이션 이름)
  const schemaVersion = await getLatestMigration();

  const zip = new JSZip();

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: "1.0",
        schemaVersion,
        createdAt: new Date().toISOString(),
        tables: Object.keys(allData),
      },
      null,
      2
    )
  );

  const dataFolder = zip.folder("data")!;
  for (const [table, rows] of Object.entries(allData)) {
    dataFolder.file(
      `${table}.json`,
      JSON.stringify(rows, bigIntReplacer, 2)
    );
  }

  const attachmentsFolder = zip.folder("attachments")!;
  await addDirToZip(attachmentsFolder, getUploadDir());

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
