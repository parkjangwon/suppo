import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";

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

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

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

/** 전체 DB + 첨부파일을 ZIP 버퍼로 반환 */
export async function createBackupZip(): Promise<Buffer> {
  // 단일 트랜잭션으로 일관된 스냅샷 확보
  const allData = await prisma.$transaction(async (tx) => ({
    category: await tx.category.findMany(),
    agent: await tx.agent.findMany(),
    agentAbsence: await tx.agentAbsence.findMany(),
    agentCategory: await tx.agentCategory.findMany(),
    customer: await tx.customer.findMany(),
    team: await tx.team.findMany(),
    teamMember: await tx.teamMember.findMany(),
    notificationSetting: await tx.notificationSetting.findMany(),
    ticket: await tx.ticket.findMany(),
    comment: await tx.comment.findMany(),
    attachment: await tx.attachment.findMany(),
    ticketActivity: await tx.ticketActivity.findMany(),
    ticketTransfer: await tx.ticketTransfer.findMany(),
    ticketMerge: await tx.ticketMerge.findMany(),
    ticketPresence: await tx.ticketPresence.findMany(),
    ticketCommentLock: await tx.ticketCommentLock.findMany(),
    customerSatisfaction: await tx.customerSatisfaction.findMany(),
    gitLink: await tx.gitLink.findMany(),
    gitEvent: await tx.gitEvent.findMany(),
    gitOperationQueue: await tx.gitOperationQueue.findMany(),
    timeEntry: await tx.timeEntry.findMany(),
    customFieldValue: await tx.customFieldValue.findMany(),
    sLAClock: await tx.sLAClock.findMany(),
    emailDelivery: await tx.emailDelivery.findMany(),
    emailThreadMapping: await tx.emailThreadMapping.findMany(),
    requestType: await tx.requestType.findMany(),
    responseTemplate: await tx.responseTemplate.findMany(),
    customFieldDefinition: await tx.customFieldDefinition.findMany(),
    sLAPolicy: await tx.sLAPolicy.findMany(),
    automationRule: await tx.automationRule.findMany(),
    savedFilter: await tx.savedFilter.findMany(),
    emailSettings: await tx.emailSettings.findMany(),
    lLMSettings: await tx.lLMSettings.findMany(),
    systemBranding: await tx.systemBranding.findMany(),
    sAMLProvider: await tx.sAMLProvider.findMany(),
    gitProviderCredential: await tx.gitProviderCredential.findMany(),
    businessCalendar: await tx.businessCalendar.findMany(),
    holiday: await tx.holiday.findMany(),
    knowledgeCategory: await tx.knowledgeCategory.findMany(),
    knowledgeArticle: await tx.knowledgeArticle.findMany(),
    knowledgeArticleFeedback: await tx.knowledgeArticleFeedback.findMany(),
    auditLog: await tx.auditLog.findMany(),
    reportSchedule: await tx.reportSchedule.findMany(),
    generatedReport: await tx.generatedReport.findMany(),
  }));

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
  await addDirToZip(attachmentsFolder, UPLOAD_DIR);

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
