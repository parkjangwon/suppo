import { prisma } from "@/lib/db/client";
import { AuditAction, AuthorType } from "@prisma/client";

export interface CreateAuditLogParams {
  actorId: string;
  actorType: "ADMIN" | "AGENT" | "CUSTOMER";
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const dbActorType = params.actorType === "CUSTOMER" ? AuthorType.CUSTOMER : AuthorType.AGENT;

    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorType: dbActorType,
        actorName: params.actorName,
        actorEmail: params.actorEmail,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        description: params.description,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
        metadata: params.metadata ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
