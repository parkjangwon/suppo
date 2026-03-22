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

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="backup-${timestamp}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ error: "백업 생성 실패" }, { status: 500 });
  }
}
