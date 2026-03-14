import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import { createTicket } from "@/lib/tickets/create-ticket";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("createTicket", () => {
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
    await prisma.customer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates ticket with CRN- prefix number", async () => {
    const category = await prisma.category.create({
      data: { name: "General", sortOrder: 1 }
    });

    const result = await createTicket({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      subject: "Test Subject",
      description: "Test Description",
      categoryId: category.id,
      priority: "HIGH"
    });

    expect(result.ticket.ticketNumber).toMatch(/^CRN-[A-Za-z0-9_-]{10}$/);
  });

  it("logs CREATED activity", async () => {
    const category = await prisma.category.create({
      data: { name: "Bug", sortOrder: 1 }
    });

    const result = await createTicket({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      subject: "Broken flow",
      description: "Something failed",
      categoryId: category.id,
      priority: "HIGH"
    });

    expect(result.activities.some((activity) => activity.action === "CREATED")).toBe(true);
  });

  it("assigns to available agent when possible", async () => {
    const category = await prisma.category.create({
      data: { name: "Payments", sortOrder: 1 }
    });

    const agent = await prisma.agent.create({
      data: {
        name: "Available Agent",
        email: "available@example.com",
        maxTickets: 2
      }
    });

    await prisma.agentCategory.create({
      data: {
        agentId: agent.id,
        categoryId: category.id
      }
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "CRN-SEED000001",
        customerName: "Existing Customer",
        customerEmail: "existing@example.com",
        subject: "Existing Ticket",
        description: "Existing",
        categoryId: category.id,
        priority: "MEDIUM",
        status: "OPEN",
        assigneeId: agent.id
      }
    });

    const result = await createTicket({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      subject: "Need help",
      description: "Payment error",
      categoryId: category.id,
      priority: "HIGH"
    });

    expect(result.ticket.assigneeId).toBe(agent.id);
    expect(result.activities.some((activity) => activity.action === "ASSIGNED")).toBe(true);
  });

  it("creates unassigned ticket when no agents available", async () => {
    const category = await prisma.category.create({
      data: { name: "Accounts", sortOrder: 1 }
    });

    const agent = await prisma.agent.create({
      data: {
        name: "Busy Agent",
        email: "busy@example.com",
        maxTickets: 1
      }
    });

    await prisma.agentCategory.create({
      data: {
        agentId: agent.id,
        categoryId: category.id
      }
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "CRN-SEED000002",
        customerName: "Existing Customer",
        customerEmail: "existing@example.com",
        subject: "Existing Ticket",
        description: "Existing",
        categoryId: category.id,
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        assigneeId: agent.id
      }
    });

    const result = await createTicket({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      subject: "No one free",
      description: "Please investigate",
      categoryId: category.id,
      priority: "LOW"
    });

    expect(result.ticket.assigneeId).toBeNull();
    expect(result.activities.some((activity) => activity.action === "ASSIGNED")).toBe(false);
  });

  it("upserts customer record and links to ticket", async () => {
    const category = await prisma.category.create({
      data: { name: "Support", sortOrder: 1 }
    });

    const result1 = await createTicket({
      customerName: "New Customer",
      customerEmail: "new@example.com",
      customerPhone: "010-1234-5678",
      subject: "First Ticket",
      description: "Hello",
      categoryId: category.id,
      priority: "MEDIUM"
    });

    const customer1 = await prisma.customer.findUnique({
      where: { email: "new@example.com" }
    });

    expect(customer1).not.toBeNull();
    expect(customer1?.name).toBe("New Customer");
    expect(customer1?.ticketCount).toBe(1);
    expect(result1.ticket.customerId).toBe(customer1?.id);

    const result2 = await createTicket({
      customerName: "Updated Name",
      customerEmail: "new@example.com",
      customerPhone: "010-9999-9999",
      subject: "Second Ticket",
      description: "World",
      categoryId: category.id,
      priority: "LOW"
    });

    const customer2 = await prisma.customer.findUnique({
      where: { email: "new@example.com" }
    });

    expect(customer2?.id).toBe(customer1?.id);
    expect(customer2?.name).toBe("Updated Name");
    expect(customer2?.phone).toBe("010-9999-9999");
    expect(customer2?.ticketCount).toBe(2);
    expect(result2.ticket.customerId).toBe(customer1?.id);
  });
});
