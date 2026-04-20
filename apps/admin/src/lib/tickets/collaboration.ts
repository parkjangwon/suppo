import { prisma } from "@suppo/db";

const PRESENCE_STALE_MS = 35_000; // 35초 후 stale로 간주
const LOCK_DURATION_MS = 60_000; // 60초 락 유효기간
const LOCK_RENEWAL_MS = 30_000; // 30초마다 갱신

export interface PresenceInfo {
  agentId: string;
  agentName: string;
  lastSeenAt: Date;
}

export interface LockInfo {
  agentId: string;
  agentName: string;
  acquiredAt: Date;
  expiresAt: Date;
}

/**
 * 상담원의 티켓 조회 하트비트를 기록합니다.
 */
export async function heartbeatPresence(
  ticketId: string,
  agentId: string
): Promise<void> {
  await prisma.ticketPresence.upsert({
    where: {
      ticketId_agentId: {
        ticketId,
        agentId,
      },
    },
    update: {
      lastSeenAt: new Date(),
    },
    create: {
      ticketId,
      agentId,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * 특정 티켓의 현재 활성 상담원 목록을 조회합니다.
 */
export async function getActiveViewers(
  ticketId: string,
  excludeAgentId?: string
): Promise<PresenceInfo[]> {
  const staleThreshold = new Date(Date.now() - PRESENCE_STALE_MS);

  const presences = await prisma.ticketPresence.findMany({
    where: {
      ticketId,
      lastSeenAt: {
        gte: staleThreshold,
      },
      ...(excludeAgentId && {
        agentId: {
          not: excludeAgentId,
        },
      }),
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      lastSeenAt: "desc",
    },
  });

  return presences.map((p) => ({
    agentId: p.agent.id,
    agentName: p.agent.name,
    lastSeenAt: p.lastSeenAt,
  }));
}

/**
 * 상담원의 티켓 조회 상태를 제거합니다 (페이지 이탈 시).
 */
export async function removePresence(
  ticketId: string,
  agentId: string
): Promise<void> {
  await prisma.ticketPresence.deleteMany({
    where: {
      ticketId,
      agentId,
    },
  });
}

/**
 * 댓글 편집 락을 획득합니다.
 * 이미 다른 상담원이 락을 보유하고 있으면 null을 반환합니다.
 */
export async function acquireCommentLock(
  ticketId: string,
  agentId: string
): Promise<LockInfo | null> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  // 기존 락 확인
  const existingLock = await prisma.ticketCommentLock.findUnique({
    where: { ticketId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (existingLock) {
    // 락이 만료되었으면 삭제
    if (existingLock.expiresAt < now) {
      await prisma.ticketCommentLock.delete({
        where: { id: existingLock.id },
      });
    } else if (existingLock.agentId !== agentId) {
      // 다른 상담원이 유효한 락을 보유 중
      return null;
    } else {
      // 자신의 락이면 갱신
      const updated = await prisma.ticketCommentLock.update({
        where: { id: existingLock.id },
        data: { expiresAt },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      return {
        agentId: updated.agent.id,
        agentName: updated.agent.name,
        acquiredAt: updated.acquiredAt,
        expiresAt: updated.expiresAt,
      };
    }
  }

  // 새 락 생성
  try {
    const lock = await prisma.ticketCommentLock.create({
      data: {
        ticketId,
        agentId,
        expiresAt,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return {
      agentId: lock.agent.id,
      agentName: lock.agent.name,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
    };
  } catch (error) {
    // 중복 생성 시도 (race condition)
    return null;
  }
}

/**
 * 댓글 편집 락을 해제합니다.
 */
export async function releaseCommentLock(
  ticketId: string,
  agentId: string
): Promise<boolean> {
  const result = await prisma.ticketCommentLock.deleteMany({
    where: {
      ticketId,
      agentId,
    },
  });
  return result.count > 0;
}

/**
 * 특정 티켓의 현재 댓글 락 상태를 조회합니다.
 */
export async function getCommentLock(
  ticketId: string
): Promise<LockInfo | null> {
  const now = new Date();

  const lock = await prisma.ticketCommentLock.findUnique({
    where: { ticketId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!lock) return null;

  // 만료된 락은 삭제
  if (lock.expiresAt < now) {
    await prisma.ticketCommentLock.delete({
      where: { id: lock.id },
    });
    return null;
  }

  return {
    agentId: lock.agent.id,
    agentName: lock.agent.name,
    acquiredAt: lock.acquiredAt,
    expiresAt: lock.expiresAt,
  };
}

/**
 * 현재 상담원이 락을 보유하고 있는지 확인합니다.
 */
export async function verifyLockOwnership(
  ticketId: string,
  agentId: string
): Promise<boolean> {
  const lock = await getCommentLock(ticketId);
  return lock?.agentId === agentId;
}

/**
 * Stale한 presence 데이터를 정리합니다 (주기적으로 실행).
 */
export async function cleanupStalePresence(): Promise<number> {
  const staleThreshold = new Date(Date.now() - PRESENCE_STALE_MS);

  const result = await prisma.ticketPresence.deleteMany({
    where: {
      lastSeenAt: {
        lt: staleThreshold,
      },
    },
  });

  return result.count;
}

/**
 * 만료된 락을 정리합니다 (주기적으로 실행).
 */
export async function cleanupExpiredLocks(): Promise<number> {
  const now = new Date();

  const result = await prisma.ticketCommentLock.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  return result.count;
}
