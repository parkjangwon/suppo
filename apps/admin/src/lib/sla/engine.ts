// SLA 계산 엔진
// 비즈니스 시간 기준으로 SLA 시간을 계산하고 관리합니다

import { SLAClockStatus, SLATarget, TicketStatus } from "@prisma/client";
import { prisma } from "@crinity/db";

interface BusinessHours {
  workStartHour: number; // 9 = 9AM
  workEndHour: number; // 18 = 6PM
  workDays: number[]; // [1,2,3,4,5] = 월-금
  timezone: string;
  holidays: Date[];
}

interface SLAResult {
  deadlineAt: Date;
  remainingMinutes: number;
  isBreached: boolean;
  isWarning: boolean; // 80% 이상 사용
}

/**
 * SLA 정책에 따라 티켓의 SLA 클락을 초기화합니다
 */
export async function initializeSLAClocks(
  ticketId: string,
  priority: string,
  businessHours: BusinessHours
): Promise<void> {
  // 해당 우선순위의 SLA 정책 조회
  const policy = await prisma.sLAPolicy.findFirst({
    where: {
      priority: priority as any,
      isActive: true,
    },
  });

  if (!policy) {
    console.warn(`No SLA policy found for priority: ${priority}`);
    return;
  }

  // First Response SLA Clock 생성
  const firstResponseDeadline = calculateDeadline(
    new Date(),
    policy.firstResponseHours,
    businessHours
  );

  await prisma.sLAClock.create({
    data: {
      ticketId,
      policyId: policy.id,
      target: SLATarget.FIRST_RESPONSE,
      status: SLAClockStatus.RUNNING,
      deadlineAt: firstResponseDeadline,
    },
  });

  // Resolution SLA Clock 생성
  const resolutionDeadline = calculateDeadline(
    new Date(),
    policy.resolutionHours,
    businessHours
  );

  await prisma.sLAClock.create({
    data: {
      ticketId,
      policyId: policy.id,
      target: SLATarget.RESOLUTION,
      status: SLAClockStatus.RUNNING,
      deadlineAt: resolutionDeadline,
    },
  });
}

/**
 * 비즈니스 시간을 고려하여 마감 시간을 계산합니다
 */
export function calculateDeadline(
  startAt: Date,
  hours: number,
  businessHours: BusinessHours
): Date {
  let remainingMinutes = hours * 60;
  let current = new Date(startAt);

  while (remainingMinutes > 0) {
    // 현재 시간이 업무 시간 내인지 확인
    if (isBusinessTime(current, businessHours)) {
      // 현재 날짜의 업무 종료 시간
      const workEndToday = new Date(current);
      workEndToday.setHours(businessHours.workEndHour, 0, 0, 0);

      // 현재부터 업무 종료까지 남은 시간(분)
      const minutesUntilEnd = Math.max(
        0,
        Math.floor((workEndToday.getTime() - current.getTime()) / 60000)
      );

      if (minutesUntilEnd >= remainingMinutes) {
        // 오늘 안에 처리 가능
        current = new Date(current.getTime() + remainingMinutes * 60000);
        remainingMinutes = 0;
      } else {
        // 오늘 업무 시간 종료, 다음 업무일로
        remainingMinutes -= minutesUntilEnd;
        current = getNextBusinessDay(current, businessHours);
        current.setHours(businessHours.workStartHour, 0, 0, 0);
      }
    } else {
      // 업무 시간이 아니면 다음 업무 시간으로 이동
      current = getNextBusinessTime(current, businessHours);
    }
  }

  return current;
}

/**
 * 주어진 시간이 업무 시간인지 확인합니다
 */
function isBusinessTime(date: Date, businessHours: BusinessHours): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  // 근무일 체크
  if (!businessHours.workDays.includes(day)) {
    return false;
  }

  // 휴일 체크
  const dateStr = date.toISOString().split("T")[0];
  if (businessHours.holidays.some((h) => h.toISOString().startsWith(dateStr))) {
    return false;
  }

  // 업무 시간 체크
  return hour >= businessHours.workStartHour && hour < businessHours.workEndHour;
}

/**
 * 다음 업무 시간으로 이동합니다
 */
function getNextBusinessTime(date: Date, businessHours: BusinessHours): Date {
  let next = new Date(date);

  // 같은 날 업무 시작 시간 이전이면
  if (next.getHours() < businessHours.workStartHour) {
    next.setHours(businessHours.workStartHour, 0, 0, 0);
    if (isBusinessTime(next, businessHours)) {
      return next;
    }
  }

  // 다음 업무일로 이동
  next = getNextBusinessDay(next, businessHours);
  next.setHours(businessHours.workStartHour, 0, 0, 0);

  return next;
}

/**
 * 다음 근무일을 찾습니다
 */
function getNextBusinessDay(date: Date, businessHours: BusinessHours): Date {
  let next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(businessHours.workStartHour, 0, 0, 0);

  // 근무일이 될 때까지 하루씩 증가
  while (!isBusinessDay(next, businessHours)) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * 주어진 날짜가 근무일인지 확인합니다 (시간 무관)
 */
function isBusinessDay(date: Date, businessHours: BusinessHours): boolean {
  const day = date.getDay();

  if (!businessHours.workDays.includes(day)) {
    return false;
  }

  const dateStr = date.toISOString().split("T")[0];
  if (businessHours.holidays.some((h) => h.toISOString().startsWith(dateStr))) {
    return false;
  }

  return true;
}

/**
 * SLA 클락을 일시 정지합니다 (PENDING_CUSTOMER 등)
 */
export async function pauseSLAClock(
  ticketId: string,
  target: SLATarget
): Promise<void> {
  const clock = await prisma.sLAClock.findFirst({
    where: {
      ticketId,
      target,
      status: SLAClockStatus.RUNNING,
    },
  });

  if (clock) {
    await prisma.sLAClock.update({
      where: { id: clock.id },
      data: {
        status: SLAClockStatus.PAUSED,
        pausedAt: new Date(),
      },
    });
  }
}

/**
 * SLA 클락을 재개합니다
 */
export async function resumeSLAClock(
  ticketId: string,
  target: SLATarget,
  businessHours: BusinessHours
): Promise<void> {
  const clock = await prisma.sLAClock.findFirst({
    where: {
      ticketId,
      target,
      status: SLAClockStatus.PAUSED,
    },
  });

  if (clock && clock.pausedAt) {
    // 일시정지된 시간을 총 일시정지 시간에 추가
    const pausedMinutes = Math.floor(
      (new Date().getTime() - clock.pausedAt.getTime()) / 60000
    );

    // 마감 시간 연장
    const newDeadline = calculateDeadline(
      clock.deadlineAt,
      pausedMinutes / 60,
      businessHours
    );

    await prisma.sLAClock.update({
      where: { id: clock.id },
      data: {
        status: SLAClockStatus.RUNNING,
        pausedAt: null,
        totalPausedMinutes: {
          increment: pausedMinutes,
        },
        deadlineAt: newDeadline,
      },
    });
  }
}

/**
 * SLA 클락을 중지합니다 (해결/종료 시)
 */
export async function stopSLAClock(
  ticketId: string,
  target: SLATarget
): Promise<void> {
  await prisma.sLAClock.updateMany({
    where: {
      ticketId,
      target,
      status: { in: [SLAClockStatus.RUNNING, SLAClockStatus.PAUSED] },
    },
    data: {
      status: SLAClockStatus.STOPPED,
    },
  });
}

/**
 * SLA 위반 여부를 체크하고 알림을 발송합니다
 */
export async function checkSLABreaches(): Promise<void> {
  const now = new Date();

  // 마감 임박 클락 조회 (1시간 이내)
  const warningClocks = await prisma.sLAClock.findMany({
    where: {
      status: SLAClockStatus.RUNNING,
      deadlineAt: {
        lte: new Date(now.getTime() + 60 * 60 * 1000), // 1시간 후
        gt: now,
      },
      warningSentAt: null,
    },
    include: {
      ticket: {
        include: {
          assignee: true,
        },
      },
      policy: true,
    },
  });

  for (const clock of warningClocks) {
    // TODO: 알림 발송
    await prisma.sLAClock.update({
      where: { id: clock.id },
      data: { warningSentAt: now },
    });
  }

  // 위반된 클락 조회
  const breachedClocks = await prisma.sLAClock.findMany({
    where: {
      status: SLAClockStatus.RUNNING,
      deadlineAt: {
        lte: now,
      },
      breachedAt: null,
    },
    include: {
      ticket: {
        include: {
          assignee: true,
        },
      },
      policy: true,
    },
  });

  for (const clock of breachedClocks) {
    // 위반 처리
    await prisma.sLAClock.update({
      where: { id: clock.id },
      data: { breachedAt: now },
    });

    // TODO: 위반 알림 발송 (관리자에게)
  }
}

/**
 * 비즈니스 시간 설정을 조회합니다
 */
export async function getBusinessHours(): Promise<BusinessHours> {
  const calendar = await prisma.businessCalendar.findFirst({
    where: { isActive: true },
    include: {
      holidays: {
        where: {
          OR: [
            { isRecurring: true },
            {
              date: {
                gte: new Date(new Date().getFullYear(), 0, 1),
                lt: new Date(new Date().getFullYear() + 1, 0, 1),
              },
            },
          ],
        },
      },
    },
  });

  if (!calendar) {
    // 기본값 반환
    return {
      timezone: "Asia/Seoul",
      workStartHour: 9,
      workEndHour: 18,
      workDays: [1, 2, 3, 4, 5],
      holidays: [],
    };
  }

  return {
    timezone: calendar.timezone,
    workStartHour: calendar.workStartHour,
    workEndHour: calendar.workEndHour,
    workDays: calendar.workDays,
    holidays: calendar.holidays.map((h) => h.date),
  };
}

/**
 * 티켓 상태 변경 시 SLA 상태를 업데이트합니다
 */
export async function updateSLAOnStatusChange(
  ticketId: string,
  newStatus: TicketStatus,
  oldStatus: TicketStatus
): Promise<void> {
  const businessHours = await getBusinessHours();

  // 고객 응답 대기 상태로 변경 시 Resolution SLA 일시정지
  if (newStatus === "WAITING") {
    await pauseSLAClock(ticketId, SLATarget.RESOLUTION);
  }

  // 고객 응답 대기에서 복귀 시 Resolution SLA 재개
  if (oldStatus === "WAITING" && newStatus !== "WAITING") {
    await resumeSLAClock(ticketId, SLATarget.RESOLUTION, businessHours);
  }

  // 해결 시 Resolution SLA 중지, First Response는 이미 중지되어 있거나 중지
  if (newStatus === "RESOLVED" || newStatus === "CLOSED") {
    await stopSLAClock(ticketId, SLATarget.FIRST_RESPONSE);
    await stopSLAClock(ticketId, SLATarget.RESOLUTION);
  }
}

/**
 * 첫 응답이 발생했을 때 First Response SLA를 중지합니다
 */
export async function recordFirstResponse(ticketId: string): Promise<void> {
  const clock = await prisma.sLAClock.findFirst({
    where: {
      ticketId,
      target: SLATarget.FIRST_RESPONSE,
      status: { in: [SLAClockStatus.RUNNING, SLAClockStatus.PAUSED] },
    },
  });

  if (clock) {
    await prisma.sLAClock.update({
      where: { id: clock.id },
      data: {
        status: SLAClockStatus.STOPPED,
      },
    });

    // 티켓에 첫 응답 시간 기록
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { firstResponseAt: new Date() },
    });
  }
}
