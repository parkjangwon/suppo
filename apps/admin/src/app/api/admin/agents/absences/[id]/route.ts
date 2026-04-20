import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { z } from "zod";
import { isBefore } from "date-fns";

const updateAbsenceSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(100, "제목은 100자 이내로 입력해주세요"),
  description: z.string().optional(),
  type: z.enum(["VACATION", "SICK_LEAVE", "BUSINESS_TRIP", "REMOTE_WORK", "TRAINING", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isAllDay: z.boolean().default(true),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateAbsenceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: result.error.format() },
        { status: 400 }
      );
    }

    const { title, description, type, startDate, endDate, isAllDay } = result.data;

    if (isBefore(new Date(endDate), new Date(startDate))) {
      return NextResponse.json(
        { error: "종료일은 시작일보다 늦어야 합니다." },
        { status: 400 }
      );
    }

    const existingAbsence = await prisma.agentAbsence.findUnique({
      where: { id },
    });

    if (!existingAbsence) {
      return NextResponse.json(
        { error: "일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && existingAbsence.agentId !== session.user.id) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const conflictingAbsence = await prisma.agentAbsence.findFirst({
      where: {
        agentId: existingAbsence.agentId,
        id: { not: id },
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

    if (conflictingAbsence) {
      return NextResponse.json(
        { error: "선택한 기간에 이미 등록된 일정이 있습니다." },
        { status: 409 }
      );
    }

    const absence = await prisma.agentAbsence.update({
      where: { id },
      data: {
        title,
        description,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isAllDay,
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

    return NextResponse.json(absence);
  } catch (error) {
    console.error("Failed to update absence:", error);
    return NextResponse.json(
      { error: "일정 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingAbsence = await prisma.agentAbsence.findUnique({
      where: { id },
    });

    if (!existingAbsence) {
      return NextResponse.json(
        { error: "일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && existingAbsence.agentId !== session.user.id) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    await prisma.agentAbsence.delete({
      where: { id },
    });

    return NextResponse.json({ message: "일정이 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete absence:", error);
    return NextResponse.json(
      { error: "일정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
