import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { restoreFromZip } from "@/lib/system/restore";
import { prisma } from "@/lib/db/client";

const MAX_SIZE = 600 * 1024 * 1024; // 600 MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일이 너무 큽니다 (최대 600MB)" },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "파일이 없습니다" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    const result = await restoreFromZip(zipBuffer);

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id!,
        actorEmail: session.user.email!,
        actorName: session.user.name ?? "",
        actorType: "AGENT",
        action: "SETTINGS_CHANGE",
        resourceType: "SYSTEM",
        description: `전체 데이터 복구 완료 (백업 스키마: ${result.backupSchemaVersion})`,
      },
    });

    return NextResponse.json({
      success: true,
      schemaVersionMatch: result.schemaVersionMatch,
    });
  } catch (error) {
    console.error("Restore failed:", error);
    const message =
      error instanceof Error ? error.message : "복구 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
