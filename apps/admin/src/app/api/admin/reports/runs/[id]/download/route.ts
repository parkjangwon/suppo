import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { readReportFile } from "@/lib/reports/storage";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const report = await prisma.generatedReport.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status !== "READY" || !report.storageKey) {
      return NextResponse.json({ error: "Report not ready" }, { status: 400 });
    }

    const buffer = await readReportFile(report.storageKey);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": report.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${report.fileName || "report.xlsx"}"`,
      },
    });
  } catch (error) {
    console.error("Failed to download report:", error);
    return NextResponse.json({ error: "Failed to download report" }, { status: 500 });
  }
}
