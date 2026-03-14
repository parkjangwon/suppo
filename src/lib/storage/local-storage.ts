import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function saveToLocal(file: File, ticketId: string, uniqueName: string): Promise<string> {
  const ticketDir = path.join(UPLOAD_DIR, ticketId);
  
  await fs.mkdir(ticketDir, { recursive: true });
  
  const filePath = path.join(ticketDir, uniqueName);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  await fs.writeFile(filePath, buffer);
  
  return `/uploads/${ticketId}/${uniqueName}`;
}
