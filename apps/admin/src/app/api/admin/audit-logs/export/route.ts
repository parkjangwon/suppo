import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";

const auditActions = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "ASSIGN",
  "TRANSFER",
  "STATUS_CHANGE",
  "PRIORITY_CHANGE",
  "SETTINGS_CHANGE",
  "PASSWORD_RESET",
  "ACTIVATE",
  "DEACTIVATE",
] as const;

const exportQuerySchema = z.object({
  actorId: z.string().trim().min(1).optional(),
  action: z.enum(auditActions).optional(),
  resourceType: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

type AuditAction = (typeof auditActions)[number];
type AuditLogWhereInput = {
  actorId?: string;
  action?: AuditAction;
  resourceType?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
};

type AuditLogRecord = {
  actorName: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  description: string;
  ipAddress: string | null;
  createdAt: Date;
};

type AuditLogDelegate = {
  findMany: (args: {
    where: AuditLogWhereInput;
    orderBy: { createdAt: "desc" };
    select: {
      actorName: true;
      actorEmail: true;
      action: true;
      resourceType: true;
      description: true;
      ipAddress: true;
      createdAt: true;
    };
  }) => Promise<AuditLogRecord[]>;
};

const auditLogDelegate = (prisma as unknown as { auditLog: AuditLogDelegate }).auditLog;

function buildAuditLogWhere(params: {
  actorId?: string;
  action?: AuditAction;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
}): AuditLogWhereInput {
  const createdAt: { gte?: Date; lte?: Date } = {};

  if (params.startDate) {
    createdAt.gte = params.startDate;
  }

  if (params.endDate) {
    createdAt.lte = params.endDate;
  }

  return {
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.resourceType ? { resourceType: params.resourceType } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = exportQuerySchema.parse({
      actorId: request.nextUrl.searchParams.get("actorId") ?? undefined,
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
      startDate: request.nextUrl.searchParams.get("startDate") ?? undefined,
      endDate: request.nextUrl.searchParams.get("endDate") ?? undefined,
    });

    if (params.startDate && params.endDate && params.startDate > params.endDate) {
      return NextResponse.json(
        { error: "Validation error", details: [{ message: "startDate must be before endDate" }] },
        { status: 400 },
      );
    }

    const where = buildAuditLogWhere(params);

    const auditLogs = await auditLogDelegate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        actorName: true,
        actorEmail: true,
        action: true,
        resourceType: true,
        description: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Audit Logs");

    worksheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 28 },
      { header: "Actor", key: "actor", width: 30 },
      { header: "Action", key: "action", width: 20 },
      { header: "Resource Type", key: "resourceType", width: 20 },
      { header: "Description", key: "description", width: 60 },
      { header: "IP Address", key: "ipAddress", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };

    for (const auditLog of auditLogs) {
      worksheet.addRow({
        timestamp: auditLog.createdAt.toISOString(),
        actor: `${auditLog.actorName} (${auditLog.actorEmail})`,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        description: auditLog.description,
        ipAddress: auditLog.ipAddress ?? "",
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `audit-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to export audit logs:", error);
    return NextResponse.json({ error: "Failed to export audit logs" }, { status: 500 });
  }
}
