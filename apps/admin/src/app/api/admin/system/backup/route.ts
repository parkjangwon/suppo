import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBackupZip } from "@/lib/system/backup";
import { createAuditLog } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const zipBuffer = await createBackupZip();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    await createAuditLog({
      actorId: session.user.id!,
      actorEmail: session.user.email!,
      actorName: session.user.name ?? "",
      actorType: session.user.role as "ADMIN" | "AGENT",
      action: "EXPORT",
      resourceType: "SYSTEM",
      description: "전체 데이터 백업 다운로드",
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="backup-${timestamp}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    const prismaErrorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;

    if (prismaErrorCode === "P2021" || prismaErrorCode === "P2022") {
      return NextResponse.json(
        {
          error:
            "데이터베이스 스키마가 현재 애플리케이션 버전과 맞지 않습니다. 최신 마이그레이션 또는 schema sync 후 다시 시도해주세요.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "백업 생성 실패" }, { status: 500 });
  }
}
