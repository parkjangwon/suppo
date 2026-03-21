import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { z } from "zod";
import { startOfDay, endOfDay, isBefore, isAfter } from "date-fns";

const absenceSchema = z.object({
  agentId: z.string().min(1, "상담원을 선택해주세요"),
  title: z.string().min(1, "제목을 입력해주세요").max(100, "제목은 100자 이내로 입력해주세요"),
  description: z.string().optional(),
  type: z.enum(["VACATION", "SICK_LEAVE", "BUSINESS_TRIP", "REMOTE_WORK", "TRAINING", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isAllDay: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where: Record<string, unknown> = {};
    
    if (agentId) {
      where.agentId = agentId;
    }

    if (start && end) {
      where.OR = [
        {
          startDate: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        {
          endDate: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        {
          AND: [
            { startDate: { lte: new Date(start) } },
            { endDate: { gte: new Date(end) } },
          ],
        },
      ];
    }

    const absences = await prisma.agentAbsence.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json(absences);
  } catch (error) {
    console.error("Failed to fetch absences:", error);
    return NextResponse.json(
      { error: "일정을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = absenceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: result.error.format() },
        { status: 400 }
      );
    }

    const { agentId, title, description, type, startDate, endDate, isAllDay } = result.data;

    if (isBefore(new Date(endDate), new Date(startDate))) {
      return NextResponse.json(
        { error: "종료일은 시작일보다 늦어야 합니다." },
        { status: 400 }
      );
    }

    const existingAbsence = await prisma.agentAbsence.findFirst({
      where: {
        agentId,
        OR: [
          {
            startDate: {
              lte: new Date(endDate),
            },
            endDate: {
              gte: new Date(startDate),
            },
          },
        ],
      },
    });

    if (existingAbsence) {
      return NextResponse.json(
        { error: "선택한 기간에 이미 등록된 일정이 있습니다." },
        { status: 409 }
      );
    }

    const absence = await prisma.agentAbsence.create({
      data: {
        agentId,
        title,
        description,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isAllDay,
        createdById: session.user.id,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(absence, { status: 201 });
  } catch (error) {
    console.error("Failed to create absence:", JSON.stringify(error, null, 2));
    const message = error instanceof Error ? error.message : "일정 등록 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
