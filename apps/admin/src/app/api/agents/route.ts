import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";

import { getBackofficeSession } from "@crinity/shared/auth/session";
import { prisma } from "@crinity/db";
import { formatPhoneNumberInput } from "@crinity/shared/utils/phone-format";
import { createAuditLog } from "@/lib/audit/logger";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const createAgentSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요"),
  email: z
    .string()
    .trim()
    .min(3, "이메일을 입력해주세요")
    .refine((value) => value.includes("@"), "유효한 이메일을 입력해주세요"),
  phone: z.string().trim().optional(),
  role: z.enum(["ADMIN", "TEAM_LEAD", "AGENT", "VIEWER"]),
  maxTickets: z.number().int().min(1).max(200),
  categories: z.array(z.string().trim().min(1)).default([]),
  teams: z.array(z.string().trim().min(1)).default([]),
  leaderTeamId: z.string().trim().optional()
});

function isAdminSession(role: string | undefined): boolean {
  return role === "ADMIN";
}

function isUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = error as { code?: string };
  return maybeCode.code === "P2002";
}

export async function GET(request: NextRequest) {
  const session = await getBackofficeSession();
  if (!session || !isAdminSession(session.user.role)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const active = searchParams.get("active");
  const role = searchParams.get("role");

  const agents = await prisma.agent.findMany({
    where: {
      ...(active === "true" ? { isActive: true } : {}),
      ...(role === "ADMIN" || role === "TEAM_LEAD" || role === "AGENT" || role === "VIEWER"
        ? { role }
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
      },
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: {
                in: ["OPEN", "IN_PROGRESS", "WAITING"]
              }
            }
          }
        }
      }
    },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  const session = await getBackofficeSession();
  if (!session || !isAdminSession(session.user.role)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const tempPassword = generateTempPassword();
    const passwordHash = await hash(tempPassword, 10);

    const agent = await prisma.agent.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ? formatPhoneNumberInput(parsed.data.phone) : undefined,
        role: parsed.data.role,
        maxTickets: parsed.data.maxTickets,
        passwordHash,
        isInitialPassword: true,
        categories: {
          create: parsed.data.categories.map((categoryId) => ({ categoryId }))
        },
        teamMemberships: {
          create: parsed.data.teams.map((teamId) => ({
            teamId,
            isLeader: teamId === parsed.data.leaderTeamId
          }))
        }
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
      action: "CREATE",
      resourceType: "agent",
      resourceId: agent.id,
      description: `상담원 생성: ${agent.name} (${agent.email})`,
      newValue: {
        name: agent.name,
        email: agent.email,
        role: agent.role,
        maxTickets: agent.maxTickets,
        categories: agent.categories.map((c) => c.category.name),
        teams: agent.teamMemberships.map((m) => m.team.name)
      }
    });

    return NextResponse.json({ agent, tempPassword }, { status: 201 });
  } catch (error) {
    if (isUniqueError(error)) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 409 });
    }

    throw error;
  }
}
