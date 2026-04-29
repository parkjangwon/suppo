import fs from "fs/promises";
import path from "path";
import { getUploadDir, isPathInside } from "./upload-config";

const CONTENT_TYPES: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

export async function serveUploadedFile(segments: string[] | undefined): Promise<Response> {
  if (!segments || segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const uploadDir = getUploadDir();
  const filePath = path.resolve(uploadDir, ...segments);

  if (!isPathInside(filePath, uploadDir)) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const body = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new Response(new Uint8Array(body), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Length": stat.size.toString(),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}
