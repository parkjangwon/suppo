import fs from "fs/promises";
import path from "path";
import { getUploadDir, isPathInside } from "./upload-config";

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const allowedExt = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".zip"];
  
  if (!allowedExt.includes(ext)) {
    throw new Error("Invalid file extension");
  }
  
  return ext;
}

export async function saveToLocal(file: File, ticketId: string, uniqueName: string): Promise<string> {
  const uploadDir = getUploadDir();
  const sanitizedTicketId = path.basename(ticketId);
  const ticketDir = path.join(uploadDir, sanitizedTicketId);
  const resolvedTicketDir = path.resolve(ticketDir);
  const resolvedUploadDir = path.resolve(uploadDir);
  
  if (!isPathInside(resolvedTicketDir, resolvedUploadDir)) {
    throw new Error("Invalid ticket ID: path traversal detected");
  }
  
  await fs.mkdir(ticketDir, { recursive: true });
  
  const ext = sanitizeFilename(file.name);
  const safeFilename = uniqueName.toLowerCase().endsWith(ext) ? uniqueName : `${uniqueName}${ext}`;
  const filePath = path.join(ticketDir, safeFilename);
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  await fs.writeFile(filePath, buffer);
  
  return `/uploads/${sanitizedTicketId}/${safeFilename}`;
}
