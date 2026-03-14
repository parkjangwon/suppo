import { describe, expect, it } from "vitest";

import { pickAssignee, type CandidateAgent } from "@/lib/assignment/pick-assignee";

describe("pickAssignee", () => {
  it("prefers the least-loaded specialist", () => {
    const candidates: CandidateAgent[] = [
      {
        id: "agent-1",
        name: "Agent A",
        maxTickets: 10,
        currentTickets: 5,
        loadRatio: 0.5,
        lastAssignedAt: new Date("2024-01-01T00:00:00.000Z")
      },
      {
        id: "agent-2",
        name: "Agent B",
        maxTickets: 10,
        currentTickets: 2,
        loadRatio: 0.2,
        lastAssignedAt: new Date("2024-01-02T00:00:00.000Z")
      }
    ];

    const result = pickAssignee(candidates);
    expect(result?.id).toBe("agent-2");
  });

  it("breaks ties by oldest assignment time", () => {
    const candidates: CandidateAgent[] = [
      {
        id: "agent-1",
        name: "Agent A",
        maxTickets: 10,
        currentTickets: 5,
        loadRatio: 0.5,
        lastAssignedAt: new Date("2024-01-01T00:00:00.000Z")
      },
      {
        id: "agent-2",
        name: "Agent B",
        maxTickets: 10,
        currentTickets: 5,
        loadRatio: 0.5,
        lastAssignedAt: new Date("2024-01-03T00:00:00.000Z")
      }
    ];

    const result = pickAssignee(candidates);
    expect(result?.id).toBe("agent-1");
  });

  it("treats agents without assignment history as oldest", () => {
    const candidates: CandidateAgent[] = [
      {
        id: "agent-1",
        name: "Agent A",
        maxTickets: 10,
        currentTickets: 2,
        loadRatio: 0.2,
        lastAssignedAt: new Date("2024-01-03T00:00:00.000Z")
      },
      {
        id: "agent-2",
        name: "Agent B",
        maxTickets: 10,
        currentTickets: 2,
        loadRatio: 0.2,
        lastAssignedAt: null
      }
    ];

    const result = pickAssignee(candidates);
    expect(result?.id).toBe("agent-2");
  });

  it("returns null when all candidates are at capacity", () => {
    const candidates: CandidateAgent[] = [
      {
        id: "agent-1",
        name: "Agent A",
        maxTickets: 10,
        currentTickets: 10,
        loadRatio: 1,
        lastAssignedAt: new Date("2024-01-01T00:00:00.000Z")
      }
    ];

    const result = pickAssignee(candidates);
    expect(result).toBeNull();
  });
});
