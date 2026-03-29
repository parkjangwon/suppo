type ChatStatus = "WAITING_AGENT" | "ACTIVE" | "WAITING_CUSTOMER" | "ENDED";

interface ChatThresholds {
  agentResponseTargetMinutes: number;
  customerFollowupTargetMinutes: number;
}

interface ConversationMetricInput {
  status: ChatStatus;
  startedAt: Date;
  endedAt: Date | null;
  lastCustomerMessageAt: Date | null;
  lastAgentMessageAt: Date | null;
  comments: Array<{
    authorType: string;
    createdAt: Date;
  }>;
  ticket?: {
    assignee: {
      id: string;
      name: string;
    } | null;
  };
}

export function getChatSlaState(
  conversation: Pick<ConversationMetricInput, "status" | "lastCustomerMessageAt" | "lastAgentMessageAt">,
  thresholds: ChatThresholds,
  now: Date
) {
  if (conversation.status === "WAITING_AGENT" && conversation.lastCustomerMessageAt) {
    const elapsedMinutes = (now.getTime() - conversation.lastCustomerMessageAt.getTime()) / 60000;
    if (elapsedMinutes >= thresholds.agentResponseTargetMinutes) {
      return "breached" as const;
    }
    if (elapsedMinutes >= thresholds.agentResponseTargetMinutes * 0.8) {
      return "warning" as const;
    }
  }

  return "healthy" as const;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function buildChatOperationsSummary(
  conversations: ConversationMetricInput[],
  thresholds: ChatThresholds,
  now: Date
) {
  const firstResponseMinutes = conversations
    .map((conversation) => {
      const firstCustomerMessage = conversation.comments.find((comment) => comment.authorType === "CUSTOMER");
      const firstAgentMessage = conversation.comments.find((comment) => comment.authorType === "AGENT");

      if (!firstCustomerMessage || !firstAgentMessage) {
        return null;
      }

      return (firstAgentMessage.createdAt.getTime() - firstCustomerMessage.createdAt.getTime()) / 60000;
    })
    .filter((value): value is number => value !== null);

  const conversationMinutes = conversations
    .map((conversation) => {
      if (!conversation.endedAt) {
        return null;
      }

      return (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 60000;
    })
    .filter((value): value is number => value !== null);

  const slaStates = conversations.map((conversation) => getChatSlaState(conversation, thresholds, now));

  return {
    total: conversations.length,
    waitingAgent: conversations.filter((conversation) => conversation.status === "WAITING_AGENT").length,
    waitingCustomer: conversations.filter((conversation) => conversation.status === "WAITING_CUSTOMER").length,
    active: conversations.filter((conversation) => conversation.status === "ACTIVE").length,
    ended: conversations.filter((conversation) => conversation.status === "ENDED").length,
    slaWarning: slaStates.filter((state) => state === "warning").length,
    slaBreached: slaStates.filter((state) => state === "breached").length,
    avgFirstResponseMinutes: average(firstResponseMinutes),
    avgConversationMinutes: average(conversationMinutes),
  };
}

export function buildChatAgentPerformance(conversations: ConversationMetricInput[]) {
  const byAgent = new Map<
    string,
    {
      agentId: string;
      agentName: string;
      conversationsHandled: number;
      endedConversations: number;
      firstResponseMinutes: number[];
      conversationMinutes: number[];
    }
  >();

  for (const conversation of conversations) {
    const assignee = conversation.ticket?.assignee;
    if (!assignee) {
      continue;
    }

    const current = byAgent.get(assignee.id) ?? {
      agentId: assignee.id,
      agentName: assignee.name,
      conversationsHandled: 0,
      endedConversations: 0,
      firstResponseMinutes: [],
      conversationMinutes: [],
    };

    current.conversationsHandled += 1;

    const firstCustomerMessage = conversation.comments.find((comment) => comment.authorType === "CUSTOMER");
    const firstAgentMessage = conversation.comments.find((comment) => comment.authorType === "AGENT");
    if (firstCustomerMessage && firstAgentMessage) {
      current.firstResponseMinutes.push(
        (firstAgentMessage.createdAt.getTime() - firstCustomerMessage.createdAt.getTime()) / 60000
      );
    }

    if (conversation.endedAt) {
      current.endedConversations += 1;
      current.conversationMinutes.push(
        (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 60000
      );
    }

    byAgent.set(assignee.id, current);
  }

  return Array.from(byAgent.values())
    .map((agent) => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      conversationsHandled: agent.conversationsHandled,
      endedConversations: agent.endedConversations,
      avgFirstResponseMinutes: average(agent.firstResponseMinutes),
      avgConversationMinutes: average(agent.conversationMinutes),
    }))
    .sort((a, b) => b.conversationsHandled - a.conversationsHandled || a.agentName.localeCompare(b.agentName));
}
