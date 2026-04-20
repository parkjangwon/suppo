import { prisma } from "@suppo/db";
import { createPublicTicketUrl } from "@suppo/shared/utils/app-urls";
import { TicketStatus, TicketPriority, Prisma } from "@prisma/client";

export interface AutomationCondition {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assigneeId?: string;
  teamId?: string;
  customerEmail?: string; // 특정 도메인/이메일 패턴
  keywords?: string[]; // 제목/내용에 포함된 키워드
  slaState?: "warning" | "breached";
  createdHoursAgo?: number;
  updatedHoursAgo?: number;
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
  triggerOn: string | null;
  createdById?: string;
}

function normalizeAutomationRule(
  rule: Prisma.AutomationRuleGetPayload<Record<string, never>>
): AutomationRule | null {
  if (!rule.conditions || typeof rule.conditions !== "object" || Array.isArray(rule.conditions)) {
    return null;
  }

  if (!rule.actions || typeof rule.actions !== "object" || Array.isArray(rule.actions)) {
    return null;
  }

  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    conditions: rule.conditions as AutomationCondition,
    actions: rule.actions as AutomationAction,
    triggerOn: rule.triggerOn,
    createdById: rule.createdById,
  };
}

interface TicketWithAutomationContext
  extends Prisma.TicketGetPayload<{
    include: {
      assignee: true;
      team: true;
      category: true;
      slaClocks: true;
    };
  }> {}

interface AutomationRunResult {
  processedRules: number;
  matchedTickets: number;
  updatedTickets: number;
}

function getTicketSLAState(ticket: { slaClocks?: Array<{ deadlineAt: Date; breachedAt: Date | null }> }, now: Date) {
  const clocks = ticket.slaClocks ?? [];

  if (clocks.some((clock) => clock.breachedAt !== null || clock.deadlineAt.getTime() <= now.getTime())) {
    return "breached" as const;
  }

  if (
    clocks.some(
      (clock) =>
        clock.deadlineAt.getTime() > now.getTime() &&
        clock.deadlineAt.getTime() <= now.getTime() + 60 * 60 * 1000
    )
  ) {
    return "warning" as const;
  }

  return "normal" as const;
}

function matchesAutomationConditions(
  conditions: AutomationCondition,
  ticket: Pick<
    TicketWithAutomationContext,
    | "status"
    | "priority"
    | "categoryId"
    | "assigneeId"
    | "teamId"
    | "customerEmail"
    | "subject"
    | "description"
    | "createdAt"
    | "updatedAt"
    | "slaClocks"
  >,
  now: Date
) {
  if (conditions.status && ticket.status !== conditions.status) {
    return false;
  }

  if (conditions.priority && ticket.priority !== conditions.priority) {
    return false;
  }

  if (conditions.categoryId && ticket.categoryId !== conditions.categoryId) {
    return false;
  }

  if (conditions.assigneeId !== undefined) {
    if (conditions.assigneeId === "unassigned" && ticket.assigneeId !== null) {
      return false;
    }
    if (conditions.assigneeId !== "unassigned" && ticket.assigneeId !== conditions.assigneeId) {
      return false;
    }
  }

  if (conditions.teamId && ticket.teamId !== conditions.teamId) {
    return false;
  }

  if (conditions.customerEmail) {
    const pattern = conditions.customerEmail;
    if (!ticket.customerEmail.match(new RegExp(pattern))) {
      return false;
    }
  }

  if (conditions.keywords && conditions.keywords.length > 0) {
    const searchText = `${ticket.subject} ${ticket.description}`.toLowerCase();
    const hasKeyword = conditions.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
    if (!hasKeyword) {
      return false;
    }
  }

  if (conditions.slaState) {
    const slaState = getTicketSLAState(ticket, now);
    if (slaState !== conditions.slaState) {
      return false;
    }
  }

  if (
    typeof conditions.createdHoursAgo === "number" &&
    now.getTime() - ticket.createdAt.getTime() < conditions.createdHoursAgo * 60 * 60 * 1000
  ) {
    return false;
  }

  if (
    typeof conditions.updatedHoursAgo === "number" &&
    now.getTime() - ticket.updatedAt.getTime() < conditions.updatedHoursAgo * 60 * 60 * 1000
  ) {
    return false;
  }

  return true;
}

function buildUpdatedTags(existingTags: string | null | undefined, actions: AutomationAction) {
  const currentTags = JSON.parse(existingTags || "[]") as string[];
  let nextTags = [...currentTags];

  if (actions.addTags) {
    nextTags = [...new Set([...nextTags, ...actions.addTags])];
  }

  if (actions.removeTags) {
    nextTags = nextTags.filter((tag) => !actions.removeTags?.includes(tag));
  }

  return nextTags;
}

async function applyAutomationRuleToTicket(
  rule: AutomationRule & { createdById?: string },
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

  if (!ticket) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    const actions = rule.actions as AutomationAction;
    const updates: Record<string, unknown> = {};
    const logs: string[] = [];

    if (actions.setStatus && actions.setStatus !== ticket.status) {
      updates.status = actions.setStatus;
      logs.push(`상태: ${ticket.status} → ${actions.setStatus}`);

      await tx.ticketActivity.create({
        data: {
          ticketId,
          actorType: "SYSTEM" as const,
          action: "STATUS_CHANGED",
          oldValue: ticket.status,
          newValue: actions.setStatus,
        },
      });
    }

    if (actions.setPriority && actions.setPriority !== ticket.priority) {
      updates.priority = actions.setPriority;
      logs.push(`우선순위: ${ticket.priority} → ${actions.setPriority}`);

      await tx.ticketActivity.create({
        data: {
          ticketId,
          actorType: "SYSTEM" as const,
          action: "PRIORITY_CHANGED",
          oldValue: ticket.priority,
          newValue: actions.setPriority,
        },
      });
    }

    if (actions.setAssigneeId !== undefined && actions.setAssigneeId !== ticket.assigneeId) {
      updates.assigneeId = actions.setAssigneeId;

      if (actions.setAssigneeId && ticket.assigneeId) {
        logs.push(`담당자: ${ticket.assignee?.name || ticket.assigneeId} → ${actions.setAssigneeId}`);

        await tx.ticketTransfer.create({
          data: {
            ticketId,
            fromAgentId: ticket.assigneeId,
            toAgentId: actions.setAssigneeId,
            reason: `자동화 규칙 "${rule.name}" 실행`,
          },
        });

        await tx.ticketActivity.create({
          data: {
            ticketId,
            actorType: "SYSTEM" as const,
            action: "TRANSFERRED",
            oldValue: ticket.assigneeId,
            newValue: actions.setAssigneeId,
          },
        });
      } else {
        logs.push(
          actions.setAssigneeId
            ? `담당자 지정: ${actions.setAssigneeId}`
            : `담당자 해제: ${ticket.assignee?.name || ticket.assigneeId || "미할당"}`
        );

        await tx.ticketActivity.create({
          data: {
            ticketId,
            actorType: "SYSTEM" as const,
            action: "ASSIGNED",
            oldValue: ticket.assigneeId || "unassigned",
            newValue: actions.setAssigneeId || "unassigned",
          },
        });
      }
    }

    if (actions.setTeamId && actions.setTeamId !== ticket.teamId) {
      updates.teamId = actions.setTeamId;
      logs.push(`팀: ${ticket.team?.name || ticket.teamId || "미할당"} → ${actions.setTeamId}`);
    }

    if (actions.addTags || actions.removeTags) {
      const nextTags = buildUpdatedTags(ticket.tags, actions);
      updates.tags = JSON.stringify(nextTags);
      logs.push(`태그 업데이트: ${nextTags.join(", ")}`);
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    updates.updatedBy = actorId;

    await tx.ticket.update({
      where: { id: ticketId },
      data: updates,
    });

    console.log(`[Automation] Rule "${rule.name}" executed:`, logs.join(", "));

    if (actions.sendNotification) {
      await tx.emailDelivery.create({
        data: {
          to: ticket.customerEmail,
          subject: `티켓 ${ticket.ticketNumber} 업데이트`,
          category: "CUSTOMER",
          ticketId,
          body: `
              <p>티켓 <strong>${ticket.ticketNumber}</strong>이 자동화 규칙에 의해 업데이트되었습니다.</p>
              <p>규칙: ${rule.name}</p>
              ${logs.map((log) => `<p>- ${log}</p>`).join("")}
              <p><a href="${createPublicTicketUrl(ticket.ticketNumber)}">티켓 보기</a></p>
            `,
          status: "PENDING",
        },
      });
    }
  });

  return true;
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

  return rules
    .map(normalizeAutomationRule)
    .filter((rule): rule is AutomationRule => rule !== null)
    .filter((rule) =>
      matchesAutomationConditions(
        rule.conditions,
        {
          ...ticket,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          slaClocks: [],
        },
        new Date()
      )
    );
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
    await applyAutomationRuleToTicket(rule, ticketId, actorId);
  }
}

export async function executeScheduledAutomationRules({
  now = new Date(),
}: {
  now?: Date;
} = {}): Promise<AutomationRunResult> {
  const rules = await prisma.automationRule.findMany({
    where: {
      isActive: true,
      triggerOn: "SCHEDULED",
    },
    orderBy: [{ priority: "desc" }],
  });

  if (rules.length === 0) {
    return {
      processedRules: 0,
      matchedTickets: 0,
      updatedTickets: 0,
    };
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        in: ["OPEN", "IN_PROGRESS", "WAITING"],
      },
    },
    include: {
      assignee: true,
      team: true,
      category: true,
      slaClocks: {
        where: {
          status: {
            in: ["RUNNING", "PAUSED"],
          },
        },
      },
    },
  });

  let matchedTickets = 0;
  let updatedTickets = 0;

  for (const rule of rules) {
    for (const ticket of tickets) {
      const matches = matchesAutomationConditions(rule.conditions as AutomationCondition, ticket, now);
      if (!matches) {
        continue;
      }

      matchedTickets += 1;
      const updated = await applyAutomationRuleToTicket(
        rule as AutomationRule & { createdById?: string },
        ticket.id,
        rule.createdById
      );

      if (updated) {
        updatedTickets += 1;
      }
    }
  }

  return {
    processedRules: rules.length,
    matchedTickets,
    updatedTickets,
  };
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
