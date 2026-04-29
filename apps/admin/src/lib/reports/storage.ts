import { promises as fs } from "fs";
import path from "path";

const REPORTS_DIR = process.env.NODE_ENV === "production"
  ? process.env.REPORTS_STORAGE_PATH || "/app/private/reports"
  : path.join(process.cwd(), "private", "reports");

export async function initializeStorage(): Promise<void> {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to initialize report storage:", error);
    throw error;
  }
}

// 파일 저장
export async function saveReportFile(
  storageKey: string,
  buffer: Buffer
): Promise<{ sizeBytes: number }> {
  await initializeStorage();
  
  const filePath = path.join(REPORTS_DIR, storageKey);
  const dir = path.dirname(filePath);
  
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);
  
  const stats = await fs.stat(filePath);
  return { sizeBytes: stats.size };
}

// 파일 읽기
export async function readReportFile(storageKey: string): Promise<Buffer> {
  const filePath = path.join(REPORTS_DIR, storageKey);
  return fs.readFile(filePath);
}

// 파일 존재 확인
export async function reportFileExists(storageKey: string): Promise<boolean> {
  try {
    const filePath = path.join(REPORTS_DIR, storageKey);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 파일 삭제
export async function deleteReportFile(storageKey: string): Promise<void> {
  try {
    const filePath = path.join(REPORTS_DIR, storageKey);
    await fs.unlink(filePath);
  } catch (error) {
    console.warn("Failed to delete report file:", error);
  }
}

// 저장소 키 생성
export function generateStorageKey(reportId: string, format: string): string {
  const date = new Date().toISOString().split("T")[0];
  const extension = format === "PDF" ? "pdf" : "xlsx";
  return `${date}/${reportId}.${extension}`;
}

// MIME 타입 결정
export function getMimeType(format: string): string {
  if (format === "PDF") {
    return "application/pdf";
  }
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

// 파일명 생성
export function generateFileName(
  reportType: string,
  period: { from: Date; to: Date },
  format: string
): string {
  const type = reportType === "OPERATIONAL" ? "운영보고서" : "고객보고서";
  const from = period.from.toISOString().split("T")[0];
  const to = period.to.toISOString().split("T")[0];
  const extension = format === "PDF" ? "pdf" : "xlsx";
  return `${type}_${from}_${to}.${extension}`;
}
