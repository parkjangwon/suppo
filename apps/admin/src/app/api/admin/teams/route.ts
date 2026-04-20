import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { z } from "zod";

const teamSchema = z.object({
  name: z.string().min(1, "팀 이름을 입력하세요"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  leaderId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            agent: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = teamSchema.parse(body);

    const team = await prisma.team.create({
      data: {
        name: validated.name,
        description: validated.description,
        isActive: validated.isActive,
        members: {
          create: validated.memberIds.map((agentId) => ({
            agentId,
            isLeader: agentId === validated.leaderId,
          })),
        },
      },
      include: {
        members: {
          include: {
            agent: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "이미 존재하는 팀 이름입니다" },
        { status: 409 }
      );
    }

    console.error("Failed to create team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
