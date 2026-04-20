import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { createAuditLog } from "@/lib/audit/logger";

const CALENDAR_ID = "default";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const calendar = await prisma.businessCalendar.findFirst({
    where: { isActive: true },
    include: {
      holidays: { orderBy: { date: "asc" } },
    },
  });

  if (!calendar) {
    return NextResponse.json({
      timezone: "Asia/Seoul",
      workStartHour: 9,
      workEndHour: 18,
      workDays: [1, 2, 3, 4, 5],
      holidays: [],
    });
  }

  return NextResponse.json({
    id: calendar.id,
    timezone: calendar.timezone,
    workStartHour: calendar.workStartHour,
    workEndHour: calendar.workEndHour,
    workDays: JSON.parse(calendar.workDays ?? "[1,2,3,4,5]") as number[],
    holidays: calendar.holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString().split("T")[0],
      isRecurring: h.isRecurring,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { timezone, workStartHour, workEndHour, workDays, holidays } = body;

  if (
    typeof workStartHour !== "number" ||
    typeof workEndHour !== "number" ||
    workStartHour < 0 ||
    workEndHour > 24 ||
    workStartHour >= workEndHour
  ) {
    return NextResponse.json({ error: "Invalid work hours" }, { status: 400 });
  }

  const calendar = await prisma.businessCalendar.upsert({
    where: { id: CALENDAR_ID },
    update: {
      timezone: timezone || "Asia/Seoul",
      workStartHour,
      workEndHour,
      workDays: JSON.stringify(workDays ?? [1, 2, 3, 4, 5]),
      isActive: true,
    },
    create: {
      id: CALENDAR_ID,
      name: "기본 영업 캘린더",
      timezone: timezone || "Asia/Seoul",
      workStartHour,
      workEndHour,
      workDays: JSON.stringify(workDays ?? [1, 2, 3, 4, 5]),
      isActive: true,
    },
  });

  // 휴일 교체 (기존 삭제 후 재생성)
  if (Array.isArray(holidays)) {
    await prisma.holiday.deleteMany({ where: { calendarId: calendar.id } });
    if (holidays.length > 0) {
      await prisma.holiday.createMany({
        data: holidays.map((h: { name: string; date: string; isRecurring: boolean }) => ({
          calendarId: calendar.id,
          name: h.name,
          date: new Date(h.date),
          isRecurring: h.isRecurring ?? false,
        })),
      });
    }
  }

  await createAuditLog({
    actorId: session.user.id!,
    actorType: session.user.role as "ADMIN" | "AGENT",
    actorName: session.user.name || "Unknown",
    actorEmail: session.user.email || "Unknown",
    action: "SETTINGS_CHANGE",
    resourceType: "business_hours",
    resourceId: calendar.id,
    description: "영업시간 설정 변경",
    newValue: { timezone, workStartHour, workEndHour, workDays },
  });

  return NextResponse.json({ success: true });
}
