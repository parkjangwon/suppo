import { prisma } from "@suppo/db";
import { ActivityAction } from "@prisma/client";
import { createAdminTicketDetailUrl } from "@suppo/shared/utils/app-urls";

export interface MergeTicketsParams {
  targetTicketId: string;
  sourceTicketIds: string[];
  mergedBy: string;
  mergeComment?: string;
}

export interface MergeConflict {
  field: string;
  sourceValue: unknown;
  targetValue: unknown;
}

/**
 * 티켓 병합 전 유효성 검사
 */
export async function validateMergeTickets(
  targetTicketId: string,
  sourceTicketIds: string[]
): Promise<{ valid: boolean; conflicts?: MergeConflict[]; error?: string }> {
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: [targetTicketId, ...sourceTicketIds] } },
    include: { assignee: true, team: true },
  });

  const targetTicket = tickets.find((t) => t.id === targetTicketId);
  const sourceTickets = tickets.filter((t) => sourceTicketIds.includes(t.id));

  // 유효성 검사
  if (!targetTicket) {
    return { valid: false, error: "대상 티켓을 찾을 수 없습니다." };
  }
  if (sourceTickets.length !== sourceTicketIds.length) {
    return { valid: false, error: "일부 원본 티켓을 찾을 수 없습니다." };
  }

  // 이미 병합된 티켓인지 확인
  const alreadyMerged = sourceTickets.filter((t) => t.mergedIntoId !== null);
  if (alreadyMerged.length > 0) {
    return { valid: false, error: "이미 병합된 티켓이 포함되어 있습니다." };
  }

  // 자기 자신 병합 방지
  if (sourceTicketIds.includes(targetTicketId)) {
    return { valid: false, error: "대상 티켓은 원본 티켓에 포함할 수 없습니다." };
  }

  // 충돌 감지
  const conflicts: MergeConflict[] = [];

  // 할당자 충돌
  if (
    sourceTickets.some((t) => t.assigneeId && t.assigneeId !== targetTicket.assigneeId)
  ) {
    conflicts.push({
      field: "assignee",
      sourceValue: sourceTickets.find((t) => t.assigneeId !== targetTicket.assigneeId)?.assignee?.name,
      targetValue: targetTicket.assignee?.name,
    });
  }

  // 팀 충돌
  if (
    sourceTickets.some((t) => t.teamId && t.teamId !== targetTicket.teamId)
  ) {
    conflicts.push({
      field: "team",
      sourceValue: sourceTickets.find((t) => t.teamId !== targetTicket.teamId)?.team?.name,
      targetValue: targetTicket.team?.name,
    });
  }

  // 상태 충돌
  if (
    sourceTickets.some((t) => t.status !== targetTicket.status && t.status !== "CLOSED")
  ) {
    conflicts.push({
      field: "status",
      sourceValue: sourceTickets.find((t) => t.status !== targetTicket.status)?.status,
      targetValue: targetTicket.status,
    });
  }

  return {
    valid: conflicts.length === 0,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

/**
 * 티켓 병합 실행
 */
export async function mergeTickets(params: MergeTicketsParams) {
  const { targetTicketId, sourceTicketIds, mergedBy, mergeComment } = params;

  // 티켓 정보 조회
  const [targetTicket, sourceTickets] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: targetTicketId },
      include: {
        comments: { orderBy: { createdAt: "desc" }, take: 1 },
        attachments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.ticket.findMany({
      where: { id: { in: sourceTicketIds } },
      include: {
        comments: true,
        attachments: true,
        assignee: true,
      },
    }),
  ]);

  if (!targetTicket || sourceTickets.length !== sourceTicketIds.length) {
    throw new Error("티켓을 찾을 수 없습니다.");
  }

  // 트랜잭션으로 병합 실행
  const result = await prisma.$transaction(async (tx) => {
    // 병합 기록 생성
    await tx.ticketMerge.createMany({
      data: sourceTicketIds.map((sourceId) => ({
        sourceTicketId: sourceId,
        targetTicketId,
        mergedBy,
      })),
    });

    // 원본 티켓 상태 업데이트
    await tx.ticket.updateMany({
      where: { id: { in: sourceTicketIds } },
      data: {
        mergedIntoId: targetTicketId,
        status: "CLOSED",
        updatedBy: mergedBy,
      },
    });

    // 코멘트와 첨부파일을 대상 티켓으로 이동
    const allComments = sourceTickets.flatMap((t) => t.comments);
    const allAttachments = sourceTickets.flatMap((t) => t.attachments);

    // 코멘트 병합 주석 추가
    await tx.comment.create({
      data: {
        ticketId: targetTicketId,
        authorType: "AGENT",
        authorId: mergedBy,
        authorName: targetTicket.comments[0]?.authorName || "System",
        authorEmail: targetTicket.comments[0]?.authorEmail || "",
        content: mergeComment || `티켓 병합됨: ${sourceTickets.map((t) => t.ticketNumber).join(", ")}`,
        isInternal: true,
      },
    });

    if (allComments.length > 0) {
      await tx.comment.updateMany({
        where: { id: { in: allComments.map((c) => c.id) } },
        data: { ticketId: targetTicketId },
      });
    }

    if (allAttachments.length > 0) {
      await tx.attachment.updateMany({
        where: { id: { in: allAttachments.map((a) => a.id) } },
        data: { ticketId: targetTicketId },
      });
    }

    const assigneeIds = sourceTickets
      .map((t) => t.assigneeId)
      .filter((id): id is string => id !== null && id !== mergedBy);

    const assignees = assigneeIds.length > 0
      ? await tx.agent.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, email: true },
        })
      : [];

    const assigneeMap = new Map(assignees.map((a) => [a.id, a]));

    await tx.ticketActivity.createMany({
      data: sourceTickets.map((sourceTicket) => ({
        ticketId: sourceTicket.id,
        actorType: "AGENT" as const,
        actorId: mergedBy,
        action: "MERGED" as const,
        oldValue: sourceTicket.ticketNumber,
        newValue: targetTicket.ticketNumber,
      })),
    });

    const emailData = sourceTickets
      .filter((t) => t.assigneeId && t.assigneeId !== mergedBy)
      .map((sourceTicket) => {
        const assignee = assigneeMap.get(sourceTicket.assigneeId!);
        if (!assignee) return null;
        return {
          to: assignee.email,
          subject: `티켓 ${sourceTicket.ticketNumber}이 병합되었습니다`,
          category: "INTERNAL" as const,
          ticketId: targetTicketId,
          body: `
                <p>티켓 <strong>${sourceTicket.ticketNumber}</strong>이 티켓 <strong>${targetTicket.ticketNumber}</strong>으로 병합되었습니다.</p>
                <p>대상 티켓: ${targetTicket.subject}</p>
                <p><a href="${createAdminTicketDetailUrl(targetTicketId)}">티켓 보기</a></p>
              `,
          status: "PENDING" as const,
        };
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);

    if (emailData.length > 0) {
      await tx.emailDelivery.createMany({ data: emailData });
    }

    return {
      targetTicket,
      mergedTickets: sourceTickets,
      mergedCommentCount: allComments.length,
      mergedAttachmentCount: allAttachments.length,
    };
  });

  return result;
}

/**
 * 병합된 티켓 가져오기
 */
export async function getMergedTickets(ticketId: string) {
  const merges = await prisma.ticketMerge.findMany({
    where: {
      OR: [
        { sourceTicketId: ticketId },
        { targetTicketId: ticketId },
      ],
    },
    include: {
      sourceTicket: {
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
        },
      },
      targetTicket: {
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
        },
      },
    },
    orderBy: { mergedAt: "desc" },
  });

  return merges;
}

/**
 * 티켓 병합 취소
 */
export async function unmergeTickets(mergeIds: string[], actorId: string) {
  return await prisma.$transaction(async (tx) => {
    const merges = await tx.ticketMerge.findMany({
      where: { id: { in: mergeIds } },
    });

    // 병합 레코드 삭제
    await tx.ticketMerge.deleteMany({
      where: { id: { in: mergeIds } },
    });

    // 티켓 상태 복원
    for (const merge of merges) {
      await tx.ticket.update({
        where: { id: merge.sourceTicketId },
        data: {
          mergedIntoId: null,
          status: "OPEN",
          updatedBy: actorId,
        },
      });

      // 활동 로그 기록
      await tx.ticketActivity.create({
        data: {
          ticketId: merge.sourceTicketId,
          actorType: "AGENT",
          actorId,
          action: ActivityAction.UNMERGED,
          oldValue: merge.targetTicketId,
          newValue: null,
        },
      });
    }
  });
}
