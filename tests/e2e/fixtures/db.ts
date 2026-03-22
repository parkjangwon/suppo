// tests/e2e/fixtures/db.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "node:path";

const databaseUrl = `file:${path.resolve(
  process.cwd(),
  "packages/db/dev.db"
)}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

export { prisma };

export async function seedAdmin() {
  const existing = await prisma.agent.findUnique({
    where: { email: "admin@crinity.io" },
  });
  if (existing) return existing;

  return prisma.agent.create({
    data: {
      name: "Admin",
      email: "admin@crinity.io",
      passwordHash: await bcrypt.hash("admin1234", 10),
      role: "ADMIN",
      isActive: true,
    },
  });
}

export async function seedRequestType() {
  const existing = await prisma.requestType.findFirst({
    where: { isActive: true },
  });
  if (existing) return existing;

  return prisma.requestType.create({
    data: {
      name: "일반 문의",
      isActive: true,
      sortOrder: 0,
    },
  });
}

export async function cleanupTicket(ticketNumber: string) {
  const ticket = await prisma.ticket.findUnique({ where: { ticketNumber } });
  if (!ticket) return;
  await prisma.comment.deleteMany({ where: { ticketId: ticket.id } });
  await prisma.ticketActivity.deleteMany({ where: { ticketId: ticket.id } });
  await prisma.ticket.delete({ where: { id: ticket.id } });
}

export async function getTicketByNumber(ticketNumber: string) {
  return prisma.ticket.findUnique({ where: { ticketNumber } });
}
