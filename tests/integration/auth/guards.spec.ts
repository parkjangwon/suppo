import { describe, expect, it } from "vitest";

import {
  requireAdmin,
  requireAssignedOrAdmin,
  requireBackofficeSession,
  type BackofficeSession
} from "../../../src/lib/auth/guards";

describe("Auth Guards", () => {
  const mockAdminSession: BackofficeSession = {
    user: {
      id: "1",
      email: "admin@test.com",
      name: "Admin",
      role: "ADMIN",
      agentId: "agent-1"
    }
  };

  const mockAgentSession: BackofficeSession = {
    user: {
      id: "2",
      email: "agent@test.com",
      name: "Agent",
      role: "AGENT",
      agentId: "agent-2"
    }
  };

  it("blocks anonymous access to admin routes", async () => {
    const result = await requireBackofficeSession(null);
    expect(result.allowed).toBe(false);
    expect(result.redirect).toBe("/admin/login");
  });

  it("allows admin to access any ticket", () => {
    const result = requireAssignedOrAdmin(mockAdminSession, "agent-3");
    expect(result.allowed).toBe(true);
  });

  it("allows agent to access only their assigned tickets", () => {
    const result = requireAssignedOrAdmin(mockAgentSession, "agent-2");
    expect(result.allowed).toBe(true);
  });

  it("blocks agent from accessing other agents' tickets", () => {
    const result = requireAssignedOrAdmin(mockAgentSession, "agent-3");
    expect(result.allowed).toBe(false);
  });

  it("requires ADMIN role for agent management", () => {
    expect(requireAdmin(mockAdminSession).allowed).toBe(true);
    expect(requireAdmin(mockAgentSession).allowed).toBe(false);
  });
});
