import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "@/app/api/agents/[id]/route";
import { POST as POST_DEACTIVATE } from "@/app/api/agents/[id]/deactivate/route";
import { GET, POST } from "@/app/api/agents/route";

vi.mock("@/lib/auth/session", () => ({
  getBackofficeSession: vi.fn().mockResolvedValue({
    user: {
      id: "session-1",
      email: "admin@crinity.com",
      name: "Admin",
      role: "ADMIN",
      agentId: "admin-1"
    }
  })
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    agent: {
      findMany: vi.fn().mockResolvedValue([{ id: "agent-1", name: "Agent A", isActive: true }]),
      create: vi.fn().mockResolvedValue({ id: "agent-2" }),
      update: vi.fn().mockResolvedValue({ id: "agent-1", name: "Updated Agent" }),
      delete: vi.fn().mockResolvedValue({ id: "agent-3" })
    }
  }
}));

vi.mock("@/lib/agents/deactivate-agent", () => ({
  deactivateAgent: vi.fn().mockResolvedValue({
    deactivatedAgentId: "agent-1",
    reassignedCount: 2,
    unassignedCount: 1,
    totalProcessed: 3
  })
}));

describe("Agents API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists agents", async () => {
    const request = new NextRequest("http://localhost/api/agents");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(1);
  });

  it("creates an agent", async () => {
    const request = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: "New Agent",
        email: "new-agent@crinity.com",
        role: "AGENT",
        maxTickets: 8,
        categories: ["cat-1"]
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it("updates an agent", async () => {
    const request = new NextRequest("http://localhost/api/agents/agent-1", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Updated Agent",
        maxTickets: 12,
        categories: ["cat-1", "cat-2"]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "agent-1" }) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agent.name).toBe("Updated Agent");
  });

  it("deletes an agent", async () => {
    const request = new NextRequest("http://localhost/api/agents/agent-3", {
      method: "DELETE"
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "agent-3" }) } as never);
    expect(response.status).toBe(200);
  });

  it("deactivates with reassignment", async () => {
    const request = new NextRequest("http://localhost/api/agents/agent-1/deactivate", {
      method: "POST",
      body: JSON.stringify({ reason: "퇴사" })
    });

    const response = await POST_DEACTIVATE(request, { params: Promise.resolve({ id: "agent-1" }) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.totalProcessed).toBe(3);
  });
});
