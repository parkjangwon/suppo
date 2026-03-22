import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";

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

const listQuerySchema = z.object({
  actorId: z.string().trim().min(1).optional(),
  action: z.enum(auditActions).optional(),
  resourceType: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
  id: string;
  actorId: string;
  actorType: string;
  actorName: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

type AuditLogDelegate = {
  count: (args: { where: AuditLogWhereInput }) => Promise<number>;
  findMany: (args: {
    where: AuditLogWhereInput;
    skip: number;
    take: number;
    orderBy: { createdAt: "desc" };
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
    const params = listQuerySchema.parse({
      actorId: request.nextUrl.searchParams.get("actorId") ?? undefined,
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
      startDate: request.nextUrl.searchParams.get("startDate") ?? undefined,
      endDate: request.nextUrl.searchParams.get("endDate") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? "1",
      limit: request.nextUrl.searchParams.get("limit") ?? "20",
    });

    if (params.startDate && params.endDate && params.startDate > params.endDate) {
      return NextResponse.json(
        { error: "Validation error", details: [{ message: "startDate must be before endDate" }] },
        { status: 400 },
      );
    }

    const where = buildAuditLogWhere(params);

    const [total, auditLogs] = await Promise.all([
      auditLogDelegate.count({ where }),
      auditLogDelegate.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      auditLogs,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
