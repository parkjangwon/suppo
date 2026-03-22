import type { AgentRole, Prisma } from "@prisma/client";

import { prisma } from "@crinity/db";

export async function listActiveAgents(role?: AgentRole) {
  return prisma.agent.findMany({
    where: {
      isActive: true,
      ...(role ? { role } : {})
    },
    include: {
      categories: {
        include: {
          category: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });
}

export async function getAgentById(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      categories: {
        include: {
          category: true
        }
      }
    }
  });
}

export async function createAgent(data: Prisma.AgentCreateInput) {
  return prisma.agent.create({ data });
}
