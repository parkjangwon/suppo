import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

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

/** ZIP 버퍼로부터 DB + 첨부파일 전체 복구 */
export async function restoreFromZip(zipBuffer: Buffer): Promise<RestoreResult> {
  const zip = await JSZip.loadAsync(zipBuffer);

  // manifest 검증
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("유효하지 않은 백업 파일: manifest.json 없음");
  const manifest = JSON.parse(await manifestFile.async("text"));
  if (manifest.version !== "1.0")
    throw new Error(`지원하지 않는 백업 버전: ${manifest.version}`);

  // 현재 스키마 버전
  const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM _prisma_migrations
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC
    LIMIT 1
  `;
  const currentSchema = migrations[0]?.migration_name ?? "unknown";
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
      // ── 삭제: 자식 먼저 ──────────────────────────────────────
      await tx.knowledgeArticleFeedback.deleteMany();
      await tx.knowledgeArticle.deleteMany();
      await tx.knowledgeCategory.deleteMany();
      await tx.generatedReport.deleteMany();
      await tx.reportSchedule.deleteMany();
      await tx.auditLog.deleteMany();
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
      await tx.savedFilter.deleteMany();
      await tx.agentAbsence.deleteMany();
      await tx.agentCategory.deleteMany();
      await tx.notificationSetting.deleteMany();
      await tx.teamMember.deleteMany();
      await tx.team.deleteMany();
      await tx.agent.deleteMany();
      await tx.customer.deleteMany();
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

      // ── 삽입: 부모 먼저 (삭제 역순) ─────────────────────────
      if (get("category").length)
        await tx.category.createMany({ data: get("category") as never });
      if (get("emailSettings").length)
        await tx.emailSettings.createMany({ data: get("emailSettings") as never });
      if (get("lLMSettings").length)
        await tx.lLMSettings.createMany({ data: get("lLMSettings") as never });
      if (get("systemBranding").length)
        await tx.systemBranding.createMany({ data: get("systemBranding") as never });
      if (get("sAMLProvider").length)
        await tx.sAMLProvider.createMany({ data: get("sAMLProvider") as never });
      if (get("gitProviderCredential").length)
        await tx.gitProviderCredential.createMany({ data: get("gitProviderCredential") as never });
      if (get("requestType").length)
        await tx.requestType.createMany({ data: get("requestType") as never });
      if (get("responseTemplate").length)
        await tx.responseTemplate.createMany({ data: get("responseTemplate") as never });
      if (get("customFieldDefinition").length)
        await tx.customFieldDefinition.createMany({ data: get("customFieldDefinition") as never });
      if (get("businessCalendar").length)
        await tx.businessCalendar.createMany({ data: get("businessCalendar") as never });
      if (get("holiday").length)
        await tx.holiday.createMany({ data: get("holiday") as never });
      if (get("sLAPolicy").length)
        await tx.sLAPolicy.createMany({ data: get("sLAPolicy") as never });
      if (get("automationRule").length)
        await tx.automationRule.createMany({ data: get("automationRule") as never });
      if (get("customer").length)
        await tx.customer.createMany({ data: get("customer") as never });
      if (get("agent").length)
        await tx.agent.createMany({ data: get("agent") as never });
      if (get("team").length)
        await tx.team.createMany({ data: get("team") as never });
      if (get("teamMember").length)
        await tx.teamMember.createMany({ data: get("teamMember") as never });
      if (get("notificationSetting").length)
        await tx.notificationSetting.createMany({ data: get("notificationSetting") as never });
      if (get("agentCategory").length)
        await tx.agentCategory.createMany({ data: get("agentCategory") as never });
      if (get("agentAbsence").length)
        await tx.agentAbsence.createMany({ data: get("agentAbsence") as never });
      if (get("savedFilter").length)
        await tx.savedFilter.createMany({ data: get("savedFilter") as never });
      if (get("ticket").length)
        await tx.ticket.createMany({ data: get("ticket") as never });
      if (get("sLAClock").length)
        await tx.sLAClock.createMany({ data: get("sLAClock") as never });
      if (get("customFieldValue").length)
        await tx.customFieldValue.createMany({ data: get("customFieldValue") as never });
      if (get("attachment").length)
        await tx.attachment.createMany({ data: get("attachment") as never });
      if (get("comment").length)
        await tx.comment.createMany({ data: get("comment") as never });
      if (get("emailThreadMapping").length)
        await tx.emailThreadMapping.createMany({ data: get("emailThreadMapping") as never });
      if (get("emailDelivery").length)
        await tx.emailDelivery.createMany({ data: get("emailDelivery") as never });
      if (get("gitLink").length)
        await tx.gitLink.createMany({ data: get("gitLink") as never });
      if (get("gitEvent").length)
        await tx.gitEvent.createMany({ data: get("gitEvent") as never });
      if (get("gitOperationQueue").length)
        await tx.gitOperationQueue.createMany({ data: get("gitOperationQueue") as never });
      if (get("timeEntry").length)
        await tx.timeEntry.createMany({ data: get("timeEntry") as never });
      if (get("ticketCommentLock").length)
        await tx.ticketCommentLock.createMany({ data: get("ticketCommentLock") as never });
      if (get("ticketPresence").length)
        await tx.ticketPresence.createMany({ data: get("ticketPresence") as never });
      if (get("ticketActivity").length)
        await tx.ticketActivity.createMany({ data: get("ticketActivity") as never });
      if (get("ticketTransfer").length)
        await tx.ticketTransfer.createMany({ data: get("ticketTransfer") as never });
      if (get("ticketMerge").length)
        await tx.ticketMerge.createMany({ data: get("ticketMerge") as never });
      if (get("customerSatisfaction").length)
        await tx.customerSatisfaction.createMany({ data: get("customerSatisfaction") as never });
      if (get("auditLog").length)
        await tx.auditLog.createMany({ data: get("auditLog") as never });
      if (get("reportSchedule").length)
        await tx.reportSchedule.createMany({ data: get("reportSchedule") as never });
      if (get("generatedReport").length)
        await tx.generatedReport.createMany({ data: get("generatedReport") as never });
      if (get("knowledgeCategory").length)
        await tx.knowledgeCategory.createMany({ data: get("knowledgeCategory") as never });
      if (get("knowledgeArticle").length)
        await tx.knowledgeArticle.createMany({ data: get("knowledgeArticle") as never });
      if (get("knowledgeArticleFeedback").length)
        await tx.knowledgeArticleFeedback.createMany({ data: get("knowledgeArticleFeedback") as never });
    },
    { timeout: 60000 }
  );

  // 첨부파일 원자적 교체
  const tmpDir = `${UPLOAD_DIR}_restore_tmp`;
  const backupDir = `${UPLOAD_DIR}_backup_tmp`;

  // 기존 temp 디렉토리 정리
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.rm(backupDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });

  // ZIP의 attachments/ → tmpDir 추출
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (relativePath.startsWith("attachments/") && !file.dir) {
      const relPath = relativePath.replace(/^attachments\//, "");
      const destPath = path.join(tmpDir, relPath);
      if (!destPath.startsWith(path.resolve(tmpDir))) continue;
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const content = await file.async("nodebuffer");
      await fs.writeFile(destPath, content);
    }
  }

  // 원자적 교체: current → backup → tmp → current
  try {
    await fs.rename(UPLOAD_DIR, backupDir).catch(() => {});
    await fs.rename(tmpDir, UPLOAD_DIR);
    await fs.rm(backupDir, { recursive: true, force: true });
  } catch (err) {
    // 롤백 시도
    await fs.rename(backupDir, UPLOAD_DIR).catch(() => {});
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw err;
  }

  return { schemaVersionMatch, backupSchemaVersion: manifest.schemaVersion };
}
