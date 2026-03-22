import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBackofficeSession } from "@crinity/shared/auth/session";
import { prisma } from "@crinity/db";
import { formatPhoneNumberInput } from "@crinity/shared/utils/phone-format";
import { createAuditLog } from "@/lib/audit/logger";

const updateAgentSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z
    .string()
    .trim()
    .min(3)
    .refine((value) => value.includes("@"), "유효한 이메일을 입력해주세요")
    .optional(),
  phone: z.string().trim().optional(),
  role: z.enum(["ADMIN", "AGENT"]).optional(),
  maxTickets: z.number().int().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  categories: z.array(z.string().trim().min(1)).optional(),
  teams: z.array(z.string().trim().min(1)).optional(),
  leaderTeamId: z.string().trim().optional()
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function isAdminSession(role: string | undefined): boolean {
  return role === "ADMIN";
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getBackofficeSession();
  if (!session || !isAdminSession(session.user.role)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  const oldAgent = await prisma.agent.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      teamMemberships: { include: { team: true } }
    }
  });

  if (!oldAgent) {
    return NextResponse.json({ error: "상담원을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ? formatPhoneNumberInput(data.phone) : null } : {}),
        ...(data.role ? { role: data.role } : {}),
        ...(typeof data.maxTickets === "number" ? { maxTickets: data.maxTickets } : {}),
        ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
        ...(data.categories
          ? {
              categories: {
                deleteMany: {},
                create: data.categories.map((categoryId) => ({ categoryId }))
              }
            }
          : {}),
        ...(data.teams
          ? {
              teamMemberships: {
                deleteMany: {},
                create: data.teams.map((teamId) => ({
                  teamId,
                  isLeader: teamId === data.leaderTeamId
                }))
              }
            }
          : {})
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        teamMemberships: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "UPDATE",
      resourceType: "agent",
      resourceId: agent.id,
      description: `상담원 정보 수정: ${agent.name} (${agent.email})`,
      oldValue: {
        name: oldAgent.name,
        email: oldAgent.email,
        role: oldAgent.role,
        isActive: oldAgent.isActive,
        maxTickets: oldAgent.maxTickets,
        categories: oldAgent.categories.map((c) => c.category.name),
        teams: oldAgent.teamMemberships.map((m) => m.team.name)
      },
      newValue: {
        name: agent.name,
        email: agent.email,
        role: agent.role,
        isActive: agent.isActive,
        maxTickets: agent.maxTickets,
        categories: agent.categories.map((c) => c.category.name),
        teams: agent.teamMemberships.map((m) => m.team.name)
      }
    });

    return NextResponse.json({ agent });
  } catch (error) {
    const maybeCode = error as { code?: string };
    if (maybeCode.code === "P2025") {
      return NextResponse.json({ error: "상담원을 찾을 수 없습니다" }, { status: 404 });
    }

    if (maybeCode.code === "P2002") {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 409 });
    }

    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getBackofficeSession();
  if (!session || !isAdminSession(session.user.role)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  if (session.user.agentId === id) {
    return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id }
  });

  if (!agent) {
    return NextResponse.json({ error: "상담원을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    await prisma.agent.delete({
      where: { id }
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "DELETE",
      resourceType: "agent",
      resourceId: id,
      description: `상담원 삭제: ${agent.name} (${agent.email})`,
      oldValue: {
        name: agent.name,
        email: agent.email,
        role: agent.role
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const maybeCode = error as { code?: string };
    if (maybeCode.code === "P2025") {
      return NextResponse.json({ error: "상담원을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 });
  }
}
