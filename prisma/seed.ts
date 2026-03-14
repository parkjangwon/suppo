import { AgentRole, AuthProvider, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "기능 문의", sortOrder: 1 },
  { name: "버그 신고", sortOrder: 2 },
  { name: "계정 문제", sortOrder: 3 },
  { name: "결제 문의", sortOrder: 4 },
  { name: "기타", sortOrder: 5 }
];

async function main() {
  const defaultPasswordHash = await hash("admin123", 10);

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder },
      create: category
    });
  }

  await prisma.agent.upsert({
    where: { email: "admin@crinity.io" },
    update: {
      name: "관리자",
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      authProvider: AuthProvider.CREDENTIALS,
      passwordHash: defaultPasswordHash
    },
    create: {
      name: "관리자",
      email: "admin@crinity.io",
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      authProvider: AuthProvider.CREDENTIALS,
      passwordHash: defaultPasswordHash
    }
  });

  const sampleAgents = [
    { name: "이수진", email: "agent1@crinity.io", maxTickets: 15 },
    { name: "박도현", email: "agent2@crinity.io", maxTickets: 10 },
    { name: "최민서", email: "agent3@crinity.io", maxTickets: 8 }
  ];

  for (const sampleAgent of sampleAgents) {
    await prisma.agent.upsert({
      where: { email: sampleAgent.email },
      update: {
        name: sampleAgent.name,
        role: AgentRole.AGENT,
        isActive: true,
        maxTickets: sampleAgent.maxTickets,
        authProvider: AuthProvider.CREDENTIALS,
        passwordHash: defaultPasswordHash
      },
      create: {
        name: sampleAgent.name,
        email: sampleAgent.email,
        role: AgentRole.AGENT,
        isActive: true,
        maxTickets: sampleAgent.maxTickets,
        authProvider: AuthProvider.CREDENTIALS,
        passwordHash: defaultPasswordHash
      }
    });
  }
}

main()
  .catch(async (error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
