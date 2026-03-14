import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const allowedExt = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".zip"];
  
  if (!allowedExt.includes(ext)) {
    throw new Error("Invalid file extension");
  }
  
  return ext;
}

export async function saveToLocal(file: File, ticketId: string, uniqueName: string): Promise<string> {
  const sanitizedTicketId = path.basename(ticketId);
  const ticketDir = path.join(UPLOAD_DIR, sanitizedTicketId);
  const resolvedTicketDir = path.resolve(ticketDir);
  const resolvedUploadDir = path.resolve(UPLOAD_DIR);
  
  if (!resolvedTicketDir.startsWith(resolvedUploadDir)) {
    throw new Error("Invalid ticket ID: path traversal detected");
  }
  
  await fs.mkdir(ticketDir, { recursive: true });
  
  const ext = sanitizeFilename(file.name);
  const safeFilename = `${uniqueName}${ext}`;
  const filePath = path.join(ticketDir, safeFilename);
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  await fs.writeFile(filePath, buffer);
  
  return `/uploads/${sanitizedTicketId}/${safeFilename}`;
}
