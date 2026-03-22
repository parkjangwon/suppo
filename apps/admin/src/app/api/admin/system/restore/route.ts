import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { restoreFromZip, RestoreValidationError } from "@/lib/system/restore";
import { createAuditLog } from "@/lib/audit/logger";

export const runtime = "nodejs";

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

    await createAuditLog({
      actorId: session.user.id!,
      actorEmail: session.user.email!,
      actorName: session.user.name ?? "",
      actorType: session.user.role as "ADMIN" | "AGENT",
      action: "SETTINGS_CHANGE",
      resourceType: "SYSTEM",
      description: `전체 데이터 복구 완료 (백업 스키마: ${result.backupSchemaVersion})`,
    });

    return NextResponse.json({
      success: true,
      schemaVersionMatch: result.schemaVersionMatch,
    });
  } catch (error) {
    if (error instanceof RestoreValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Restore failed:", error);
    return NextResponse.json({ error: "복구 실패" }, { status: 500 });
  }
}
