import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../src/lib/db/client";

describe("Database Schema", () => {
  beforeEach(async () => {
    await prisma.ticketActivity.deleteMany();
    await prisma.ticketTransfer.deleteMany();
    await prisma.gitLink.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.agentCategory.deleteMany();
    await prisma.responseTemplate.deleteMany();
    await prisma.category.deleteMany();
    await prisma.agent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists a ticket with category, assignee, and activity log", async () => {
    const category = await prisma.category.create({
      data: { name: "Bug", sortOrder: 1 }
    });

    const agent = await prisma.agent.create({
      data: {
        name: "Test Agent",
        email: "test@example.com",
        role: "AGENT",
        maxTickets: 10
      }
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: "CRN-TEST123",
        customerName: "Test Customer",
        customerEmail: "customer@example.com",
        subject: "Test Subject",
        description: "Test Description",
        categoryId: category.id,
        priority: "HIGH",
        assigneeId: agent.id
      }
    });

    const activity = await prisma.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorType: "AGENT",
        actorId: agent.id,
        action: "CREATED"
      }
    });

    expect(ticket.ticketNumber).toMatch(/^CRN-/);
    expect(ticket.categoryId).toBe(category.id);
    expect(ticket.assigneeId).toBe(agent.id);
    expect(activity.ticketId).toBe(ticket.id);
    expect(activity.action).toBe("CREATED");
  });
});
