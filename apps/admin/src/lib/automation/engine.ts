import { prisma } from "@crinity/db";
import { TicketStatus, TicketPriority, Prisma } from "@prisma/client";

export interface AutomationCondition {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assigneeId?: string;
  teamId?: string;
  customerEmail?: string; // 특정 도메인/이메일 패턴
  keywords?: string[]; // 제목/내용에 포함된 키워드
}

export interface AutomationAction {
  setStatus?: TicketStatus;
  setPriority?: TicketPriority;
  setAssigneeId?: string | null;
  setTeamId?: string;
  addTags?: string[];
  removeTags?: string[];
  sendNotification?: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  conditions: AutomationCondition;
  actions: AutomationAction;
  triggerOn: string;
}

/**
 * 티켓에 적용 가능한 자동화 규칙 조회
 */
export async function getApplicableRules(
  trigger: string,
  ticket: Prisma.TicketGetPayload<{ include: { assignee: true; team: true; category: true } }>
): Promise<AutomationRule[]> {
  const rules = await prisma.automationRule.findMany({
    where: {
      isActive: true,
      triggerOn: trigger,
    },
    orderBy: [
      { isActive: "desc" },
      { priority: "desc" },
    ],
  });

  // 조건 필터링
  return rules.filter((rule) => {
    const conditions = rule.conditions as AutomationCondition;

    // 상태 조건
    if (conditions.status && ticket.status !== conditions.status) {
      return false;
    }

    // 우선순위 조건
    if (conditions.priority && ticket.priority !== conditions.priority) {
      return false;
    }

    // 카테고리 조건
    if (conditions.categoryId && ticket.categoryId !== conditions.categoryId) {
      return false;
    }

    // 담당자 조건
    if (conditions.assigneeId !== undefined) {
      if (conditions.assigneeId === "unassigned" && ticket.assigneeId !== null) {
        return false;
      }
      if (conditions.assigneeId !== "unassigned" && ticket.assigneeId !== conditions.assigneeId) {
        return false;
      }
    }

    // 팀 조건
    if (conditions.teamId && ticket.teamId !== conditions.teamId) {
      return false;
    }

    // 이메일 도메인 조건
    if (conditions.customerEmail) {
      const pattern = conditions.customerEmail;
      if (!ticket.customerEmail.match(new RegExp(pattern))) {
        return false;
      }
    }

    // 키워드 조건
    if (conditions.keywords && conditions.keywords.length > 0) {
      const searchText = `${ticket.subject} ${ticket.description}`.toLowerCase();
      const hasKeyword = conditions.keywords.some((kw) =>
        searchText.includes(kw.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 자동화 규칙 실행
 */
export async function executeAutomationRules(
  trigger: string,
  ticketId: string,
  actorId: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      assignee: true,
      team: true,
      category: true,
    },
  });

  if (!ticket) return;

  const applicableRules = await getApplicableRules(trigger, ticket);

  for (const rule of applicableRules) {
    await prisma.$transaction(async (tx) => {
      const actions = rule.actions as AutomationAction;
      const updates: any = {};
      const logs: string[] = [];

      // 상태 변경
      if (actions.setStatus && actions.setStatus !== ticket.status) {
        updates.status = actions.setStatus;
        logs.push(`상태: ${ticket.status} → ${actions.setStatus}`);

        await tx.ticketActivity.create({
          data: {
            ticketId,
            actorType: "SYSTEM" as any,
            action: "STATUS_CHANGED",
            oldValue: ticket.status,
            newValue: actions.setStatus,
          },
        });
      }

      // 우선순위 변경
      if (actions.setPriority && actions.setPriority !== ticket.priority) {
        updates.priority = actions.setPriority;
        logs.push(`우선순위: ${ticket.priority} → ${actions.setPriority}`);

        await tx.ticketActivity.create({
          data: {
            ticketId,
            actorType: "SYSTEM" as any,
            action: "PRIORITY_CHANGED",
            oldValue: ticket.priority,
            newValue: actions.setPriority,
          },
        });
      }

      // 담당자 할당
      if (actions.setAssigneeId !== undefined) {
        const oldAssigneeId = ticket.assigneeId;
        updates.assigneeId = actions.setAssigneeId;
        updates.updatedBy = actorId;

        if (actions.setAssigneeId && actions.setAssigneeId !== oldAssigneeId) {
          logs.push(`담당자: ${ticket.assignee?.name || "미할당"} → ${actions.setAssigneeId}`);

          await tx.ticketTransfer.create({
            data: {
              ticketId,
              fromAgentId: oldAssigneeId || "unassigned",
              toAgentId: actions.setAssigneeId,
            },
          });

          await tx.ticketActivity.create({
            data: {
              ticketId,
              actorType: "SYSTEM" as any,
              action: "TRANSFERRED",
              oldValue: oldAssigneeId || "unassigned",
              newValue: actions.setAssigneeId,
            },
          });
        } else if (actions.setAssigneeId === null && oldAssigneeId) {
          logs.push(`담당자 해제: ${ticket.assignee?.name}`);

          await tx.ticketActivity.create({
            data: {
              ticketId,
              actorType: "SYSTEM" as any,
              action: "ASSIGNED",
              oldValue: oldAssigneeId || "unassigned",
              newValue: "unassigned",
            },
          });
        }
      }

      // 팀 할당
      if (actions.setTeamId && actions.setTeamId !== ticket.teamId) {
        updates.teamId = actions.setTeamId;
        logs.push(`팀: ${ticket.team?.name || "미할당"} → ${actions.setTeamId}`);
      }

      // 태그 추가/제거
      if (actions.addTags || actions.removeTags) {
        const currentTags = JSON.parse(ticket.tags || "[]");
        let newTags = [...currentTags];

        if (actions.addTags) {
          newTags = [...new Set([...newTags, ...actions.addTags])];
        }
        if (actions.removeTags) {
          newTags = newTags.filter((tag) => !actions.removeTags!.includes(tag));
        }

        updates.tags = JSON.stringify(newTags);
        logs.push(`태그 업데이트: ${newTags.join(", ")}`);
      }

      // 티켓 업데이트
      if (Object.keys(updates).length > 0) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: updates,
        });
      }

      // 자동화 로그 기록
      console.log(`[Automation] Rule "${rule.name}" executed:`, logs.join(", "));

      // 알림 발송
      if (actions.sendNotification) {
        await tx.emailDelivery.create({
          data: {
            to: ticket.customerEmail,
            subject: `티켓 ${ticket.ticketNumber} 업데이트`,
            body: `
              <p>티켓 <strong>${ticket.ticketNumber}</strong>이 자동화 규칙에 의해 업데이트되었습니다.</p>
              <p>규칙: ${rule.name}</p>
              ${logs.map((log) => `<p>- ${log}</p>`).join("")}
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/ticket/${ticket.ticketNumber}">티켓 보기</a></p>
            `,
            status: "PENDING",
          },
        });
      }
    });
  }
}

/**
 * 팀 기반 자동 라우팅
 * RequestType의 defaultTeamId를 기준으로 자동 할당
 */
export async function autoAssignByTeam(ticketId: string, requestTypeId: string) {
  const requestType = await prisma.requestType.findUnique({
    where: { id: requestTypeId },
    include: { defaultTeam: true },
  });

  if (!requestType?.defaultTeamId || !requestType.autoAssignEnabled) {
    return;
  }

  // 팀의 활성 멤버 중 최근 할당이 적은 에이전 찾기
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      teamId: requestType.defaultTeamId,
    },
    include: {
      agent: true,
    },
    orderBy: {
      agent: { lastAssignedAt: "asc" },
    },
  });

  if (teamMembers.length === 0) return;

  // 활성 에이전만 필터링
  const activeMembers = teamMembers
    .filter((tm) => tm.agent !== null && tm.agent.isActive);

  if (activeMembers.length === 0) return;

  const selectedAgent = activeMembers[0].agent!;

  // 티켓 할당
  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: selectedAgent.id,
        teamId: requestType.defaultTeamId,
        updatedBy: selectedAgent.id,
      },
    });

    await tx.ticketActivity.create({
      data: {
        ticketId,
        actorType: "SYSTEM" as any,
        action: "ASSIGNED",
        oldValue: "unassigned",
        newValue: selectedAgent.id,
      },
    });

    // 에이전의 lastAssignedAt 업데이트
    await tx.agent.update({
      where: { id: selectedAgent.id },
      data: { lastAssignedAt: new Date() },
    });
  });
}

/**
 * 카테고리 전문 에이전 기반 라우팅
 * AgentCategory 테이블을 기준으로 자동 할당
 */
export async function autoAssignByCategory(ticketId: string, categoryId: string) {
  // 카테고리 전문 에이전 찾기
  const categoryAgents = await prisma.agentCategory.findMany({
    where: { categoryId },
    include: { agent: true },
  });

  // 활성 에이전만 필터링
  const activeAgents = categoryAgents
    .map((ca) => ca.agent)
    .filter((agent): agent is NonNullable<typeof agent> => agent !== null && agent.isActive)
    .sort((a, b) => {
      const aTickets = a.maxTickets - (a.lastAssignedAt ? 0 : 1);
      const bTickets = b.maxTickets - (b.lastAssignedAt ? 0 : 1);
      return aTickets - bTickets;
    });

  const selectedAgent = activeAgents[0];

  if (!selectedAgent) return;

  // 티켓 할당
  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: selectedAgent.id,
        updatedBy: selectedAgent.id,
      },
    });

    await tx.ticketActivity.create({
      data: {
        ticketId,
        actorType: "SYSTEM" as any,
        action: "ASSIGNED",
        oldValue: "unassigned",
        newValue: selectedAgent.id,
      },
    });

    // 에이전의 lastAssignedAt 업데이트
    await tx.agent.update({
      where: { id: selectedAgent.id },
      data: { lastAssignedAt: new Date() },
    });
  });
}
