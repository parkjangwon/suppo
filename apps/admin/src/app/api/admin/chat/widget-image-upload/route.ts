import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import { auth } from "@/auth";
import { isAllowedImageUploadMimeType } from "@crinity/shared/security/image-upload";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getUploadDirs() {
  const currentAppUploadDir = join(process.cwd(), "public", "uploads", "chat-widget");
  const publicAppUploadDir = join(process.cwd(), "..", "public", "public", "uploads", "chat-widget");

  return Array.from(new Set([currentAppUploadDir, publicAppUploadDir]));
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string | null) ?? "widget-button";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedImageUploadMimeType(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max size: 5MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeType = type.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 32) || "widget-button";
    const filename = `${safeType}-${crypto.randomUUID()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    for (const uploadDir of getUploadDirs()) {
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);
    }

    const url = `/uploads/chat-widget/${filename}`;

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error("Chat widget image upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
