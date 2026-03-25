import { prisma } from "@crinity/db";
import { SLAClockStatus, SLATarget, TicketStatus } from "@prisma/client";
import { enqueueSLABreachEmail } from "@crinity/shared/email/enqueue";

/**
 * 티켓 상태 변경 시 SLA 시계 제어
 */
export async function handleSLAOnStatusChange(
  ticketId: string,
  newStatus: TicketStatus,
  oldStatus?: TicketStatus
): Promise<void> {
  const activeClocks = await prisma.sLAClock.findMany({
    where: {
      ticketId,
      status: { in: [SLAClockStatus.RUNNING, SLAClockStatus.PAUSED] },
    },
  });

  for (const clock of activeClocks) {
    if (newStatus === TicketStatus.WAITING) {
      await pauseSLAClock(clock.id);
    } else if (oldStatus === TicketStatus.WAITING) {
      await resumeSLAClock(clock.id);
    }
  }
}

/**
 * SLA 시계 일시정지
 */
async function pauseSLAClock(clockId: string): Promise<void> {
  await prisma.sLAClock.update({
    where: { id: clockId },
    data: {
      status: SLAClockStatus.PAUSED,
      pausedAt: new Date(),
    },
  });
}

/**
 * SLA 시계 재개
 */
async function resumeSLAClock(clockId: string): Promise<void> {
  const clock = await prisma.sLAClock.findUnique({
    where: { id: clockId },
  });

  if (!clock || !clock.pausedAt) return;

  // 일시정지된 시간 계산
  const now = new Date();
  const pausedDuration =
    now.getTime() - clock.pausedAt.getTime();
  const pausedMinutes = Math.floor(pausedDuration / (1000 * 60));

  await prisma.sLAClock.update({
    where: { id: clockId },
    data: {
      status: SLAClockStatus.RUNNING,
      pausedAt: null,
      totalPausedMinutes: {
        increment: pausedMinutes,
      },
      // 마감일 연장
      deadlineAt: {
        set: new Date(
          clock.deadlineAt.getTime() + pausedDuration
        ),
      },
    },
  });
}

/**
 * SLA 위반 체크
 */
export async function checkSLABreaches(): Promise<void> {
  const now = new Date();

  const [emailSettings, breachedClocks] = await Promise.all([
    prisma.emailSettings.findUnique({
      where: { id: "default" },
      select: { notificationEmail: true },
    }),
    prisma.sLAClock.findMany({
      where: {
        status: SLAClockStatus.RUNNING,
        deadlineAt: { lte: now },
        breachedAt: null,
      },
      include: {
        ticket: { include: { assignee: true } },
        policy: true,
      },
    }),
  ]);

  const adminEmail = emailSettings?.notificationEmail ?? null;

  for (const clock of breachedClocks) {
    await prisma.sLAClock.update({
      where: { id: clock.id },
      data: {
        status: SLAClockStatus.STOPPED,
        breachedAt: now,
      },
    });

    const targetLabel = clock.target === SLATarget.FIRST_RESPONSE ? "첫 응답" : "해결";
    const assignee = clock.ticket.assignee;

    await enqueueSLABreachEmail(
      assignee?.email,
      adminEmail,
      clock.ticket.ticketNumber,
      assignee?.name ?? "담당자",
      targetLabel
    );
  }
}

/**
 * 티켓의 활성 SLA 시계 조회
 */
export async function getActiveSLAClocks(ticketId: string) {
  return prisma.sLAClock.findMany({
    where: {
      ticketId,
      status: { in: [SLAClockStatus.RUNNING, SLAClockStatus.PAUSED] },
    },
    include: { policy: true },
  });
}
