import { v4 as uuidv4 } from "uuid";
import { saveToLocal } from "./local-storage";
import { saveToS3 } from "./s3-storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 20;

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
];

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

export async function processAttachments(files: File[], ticketId: string) {
  if (files.length > MAX_FILES) {
    throw new AttachmentError(`최대 ${MAX_FILES}개의 파일만 첨부할 수 있습니다.`);
  }

  const processedFiles = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new AttachmentError(`파일 크기는 10MB를 초과할 수 없습니다: ${file.name}`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new AttachmentError(`지원하지 않는 파일 형식입니다: ${file.name}`);
    }

    const uniqueName = `${uuidv4()}-${file.name}`;
    let url: string;

    if (process.env.NODE_ENV === "production" && process.env.AWS_S3_BUCKET_NAME) {
      url = await saveToS3(file, ticketId, uniqueName);
    } else {
      url = await saveToLocal(file, ticketId, uniqueName);
    }

    processedFiles.push({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileUrl: url,
    });
  }

  return processedFiles;
}
