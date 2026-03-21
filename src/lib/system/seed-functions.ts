import { AgentRole, AuthProvider, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const defaultCategories = [
  { name: "기능 문의", sortOrder: 1 },
  { name: "버그 신고", sortOrder: 2 },
  { name: "계정 문제", sortOrder: 3 },
  { name: "결제 문의", sortOrder: 4 },
  { name: "기타", sortOrder: 5 },
];

export async function seedInitialAdmin(prisma: PrismaClient) {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@crinity.io";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await hash(password, 10);

  await prisma.agent.upsert({
    where: { email },
    update: {
      name: "관리자",
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      authProvider: AuthProvider.CREDENTIALS,
      passwordHash,
    },
    create: {
      name: "관리자",
      email,
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      authProvider: AuthProvider.CREDENTIALS,
      passwordHash,
    },
  });
}

export async function seedDefaultCategories(prisma: PrismaClient) {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder },
      create: category,
    });
  }
}

export async function seedSampleAgents(prisma: PrismaClient) {
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await hash(password, 10);

  const sampleAgents = [
    { name: "이수진", email: "agent1@crinity.io", maxTickets: 15 },
    { name: "박도현", email: "agent2@crinity.io", maxTickets: 10 },
    { name: "최민서", email: "agent3@crinity.io", maxTickets: 8 },
  ];

  for (const agent of sampleAgents) {
    await prisma.agent.upsert({
      where: { email: agent.email },
      update: {
        name: agent.name,
        role: AgentRole.AGENT,
        isActive: true,
        maxTickets: agent.maxTickets,
        authProvider: AuthProvider.CREDENTIALS,
        passwordHash,
      },
      create: {
        name: agent.name,
        email: agent.email,
        role: AgentRole.AGENT,
        isActive: true,
        maxTickets: agent.maxTickets,
        authProvider: AuthProvider.CREDENTIALS,
        passwordHash,
      },
    });
  }
}
