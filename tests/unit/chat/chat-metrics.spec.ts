import { describe, expect, it } from "vitest";

import {
  buildChatAgentPerformance,
  buildChatOperationsSummary,
  getChatSlaState,
} from "@crinity/shared/chat/metrics";

describe("chat metrics", () => {
  it("classifies waiting-agent conversations by SLA thresholds", () => {
    const now = new Date("2026-03-28T12:00:00.000Z");

    expect(
      getChatSlaState(
        {
          status: "WAITING_AGENT",
          lastCustomerMessageAt: new Date("2026-03-28T11:56:00.000Z"),
          lastAgentMessageAt: null,
        },
        {
          agentResponseTargetMinutes: 5,
          customerFollowupTargetMinutes: 30,
        },
        now
      )
    ).toBe("warning");

    expect(
      getChatSlaState(
        {
          status: "WAITING_AGENT",
          lastCustomerMessageAt: new Date("2026-03-28T11:40:00.000Z"),
          lastAgentMessageAt: null,
        },
        {
          agentResponseTargetMinutes: 5,
          customerFollowupTargetMinutes: 30,
        },
        now
      )
    ).toBe("breached");
  });

  it("builds chat operation summary metrics", () => {
    const summary = buildChatOperationsSummary(
      [
        {
          status: "WAITING_AGENT",
          startedAt: new Date("2026-03-28T10:00:00.000Z"),
          endedAt: null,
          lastCustomerMessageAt: new Date("2026-03-28T11:40:00.000Z"),
          lastAgentMessageAt: null,
          comments: [{ authorType: "CUSTOMER", createdAt: new Date("2026-03-28T10:00:00.000Z") }],
        },
        {
          status: "WAITING_CUSTOMER",
          startedAt: new Date("2026-03-28T09:00:00.000Z"),
          endedAt: null,
          lastCustomerMessageAt: new Date("2026-03-28T09:10:00.000Z"),
          lastAgentMessageAt: new Date("2026-03-28T09:15:00.000Z"),
          comments: [
            { authorType: "CUSTOMER", createdAt: new Date("2026-03-28T09:00:00.000Z") },
            { authorType: "AGENT", createdAt: new Date("2026-03-28T09:15:00.000Z") },
          ],
        },
        {
          status: "ENDED",
          startedAt: new Date("2026-03-28T08:00:00.000Z"),
          endedAt: new Date("2026-03-28T08:30:00.000Z"),
          lastCustomerMessageAt: new Date("2026-03-28T08:05:00.000Z"),
          lastAgentMessageAt: new Date("2026-03-28T08:10:00.000Z"),
          comments: [
            { authorType: "CUSTOMER", createdAt: new Date("2026-03-28T08:00:00.000Z") },
            { authorType: "AGENT", createdAt: new Date("2026-03-28T08:10:00.000Z") },
          ],
        },
      ],
      {
        agentResponseTargetMinutes: 5,
        customerFollowupTargetMinutes: 30,
      },
      new Date("2026-03-28T12:00:00.000Z")
    );

    expect(summary.total).toBe(3);
    expect(summary.waitingAgent).toBe(1);
    expect(summary.waitingCustomer).toBe(1);
    expect(summary.ended).toBe(1);
    expect(summary.slaBreached).toBe(1);
    expect(summary.avgFirstResponseMinutes).toBe(12.5);
    expect(summary.avgConversationMinutes).toBe(30);
  });

  it("builds chat agent performance metrics", () => {
    const result = buildChatAgentPerformance([
      {
        status: "ENDED",
        startedAt: new Date("2026-03-28T08:00:00.000Z"),
        endedAt: new Date("2026-03-28T08:30:00.000Z"),
        lastCustomerMessageAt: new Date("2026-03-28T08:05:00.000Z"),
        lastAgentMessageAt: new Date("2026-03-28T08:10:00.000Z"),
        comments: [
          { authorType: "CUSTOMER", createdAt: new Date("2026-03-28T08:00:00.000Z") },
          { authorType: "AGENT", createdAt: new Date("2026-03-28T08:10:00.000Z") },
        ],
        ticket: {
          assignee: { id: "agent-1", name: "상담원 A" },
        },
      },
      {
        status: "WAITING_CUSTOMER",
        startedAt: new Date("2026-03-28T09:00:00.000Z"),
        endedAt: null,
        lastCustomerMessageAt: new Date("2026-03-28T09:10:00.000Z"),
        lastAgentMessageAt: new Date("2026-03-28T09:15:00.000Z"),
        comments: [
          { authorType: "CUSTOMER", createdAt: new Date("2026-03-28T09:00:00.000Z") },
          { authorType: "AGENT", createdAt: new Date("2026-03-28T09:15:00.000Z") },
        ],
        ticket: {
          assignee: { id: "agent-1", name: "상담원 A" },
        },
      },
      {
        status: "ENDED",
        startedAt: new Date("2026-03-28T10:00:00.000Z"),
        endedAt: new Date("2026-03-28T10:40:00.000Z"),
        lastCustomerMessageAt: new Date("2026-03-28T10:02:00.000Z"),
        lastAgentMessageAt: new Date("2026-03-28T10:05:00.000Z"),
        comments: [
          { authorType: "CUSTOMER", createdAt: new Date("2026-03-28T10:00:00.000Z") },
          { authorType: "AGENT", createdAt: new Date("2026-03-28T10:05:00.000Z") },
        ],
        ticket: {
          assignee: { id: "agent-2", name: "상담원 B" },
        },
      },
    ]);

    expect(result).toEqual([
      {
        agentId: "agent-1",
        agentName: "상담원 A",
        conversationsHandled: 2,
        endedConversations: 1,
        avgFirstResponseMinutes: 12.5,
        avgConversationMinutes: 30,
      },
      {
        agentId: "agent-2",
        agentName: "상담원 B",
        conversationsHandled: 1,
        endedConversations: 1,
        avgFirstResponseMinutes: 5,
        avgConversationMinutes: 40,
      },
    ]);
  });
});
