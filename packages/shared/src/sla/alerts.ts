import { prisma } from "@crinity/db";
import { SLAClockStatus, SLATarget } from "@prisma/client";

export interface SLABreachAlert {
  ticketId: string;
  ticketNumber: string;
  breachType: "FIRST_RESPONSE" | "RESOLUTION";
  threshold: number;
  actual: number;
  severity: "WARNING" | "BREACH";
  deadlineAt: Date;
}

export async function checkSLABreaches(): Promise<SLABreachAlert[]> {
  const now = new Date();
  const warningThreshold = 15 * 60 * 1000;

  const clocks = await prisma.sLAClock.findMany({
    where: {
      status: SLAClockStatus.RUNNING,
      deadlineAt: {
        lte: new Date(now.getTime() + warningThreshold),
      },
      breachedAt: null,
    },
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          assigneeId: true,
        },
      },
      policy: {
        select: {
          firstResponseHours: true,
          resolutionHours: true,
        },
      },
    },
  });

  const alerts: SLABreachAlert[] = [];

  for (const clock of clocks) {
    const timeRemaining = clock.deadlineAt.getTime() - now.getTime();
    const isWarning = timeRemaining > 0 && timeRemaining <= warningThreshold;
    const isBreach = timeRemaining <= 0;

    if (!isWarning && !isBreach) continue;

    const threshold =
      clock.target === SLATarget.FIRST_RESPONSE
        ? clock.policy.firstResponseHours * 60 * 60 * 1000
        : clock.policy.resolutionHours * 60 * 60 * 1000;

    const actual = threshold - timeRemaining;

    alerts.push({
      ticketId: clock.ticket.id,
      ticketNumber: clock.ticket.ticketNumber,
      breachType: clock.target as "FIRST_RESPONSE" | "RESOLUTION",
      threshold,
      actual,
      severity: isBreach ? "BREACH" : "WARNING",
      deadlineAt: clock.deadlineAt,
    });

    if (isBreach) {
      await prisma.sLAClock.update({
        where: { id: clock.id },
        data: { breachedAt: now },
      });
    }
  }

  return alerts;
}

export async function getSLABreachHistory(
  startDate: Date,
  endDate: Date
): Promise<{
  ticketId: string;
  ticketNumber: string;
  breachType: string;
  breachedAt: Date;
  assigneeName: string | null;
}[]> {
  const breaches = await prisma.sLAClock.findMany({
    where: {
      breachedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          assignee: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { breachedAt: "desc" },
  });

  return breaches.map((b) => ({
    ticketId: b.ticket.id,
    ticketNumber: b.ticket.ticketNumber,
    breachType: b.target,
    breachedAt: b.breachedAt!,
    assigneeName: b.ticket.assignee?.name || null,
  }));
}
