import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBackofficeSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

const createAgentSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요"),
  email: z
    .string()
    .trim()
    .min(3, "이메일을 입력해주세요")
    .refine((value) => value.includes("@"), "유효한 이메일을 입력해주세요"),
  role: z.enum(["ADMIN", "AGENT"]),
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
      ...(role === "ADMIN" || role === "AGENT" ? { role } : {})
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
    const agent = await prisma.agent.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        maxTickets: parsed.data.maxTickets,
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

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (isUniqueError(error)) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 409 });
    }

    throw error;
  }
}
