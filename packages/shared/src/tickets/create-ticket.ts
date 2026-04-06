import { pickAssignee, type CandidateAgent } from "@crinity/shared/assignment/pick-assignee";
import {
  AgentRole,
  type Prisma,
  type PrismaClient,
  type Ticket,
  type TicketActivity,
  type TicketPriority as PrismaTicketPriority
} from "@prisma/client";
import { prisma } from "@crinity/db";
import { logActivity } from "@crinity/shared/tickets/activity";
import { generateTicketNumber } from "@crinity/shared/tickets/ticket-number";

const ACTIVE_STATUSES: Array<"OPEN" | "IN_PROGRESS" | "WAITING"> = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING"
];
const MAX_CREATE_ATTEMPTS = 5;

type DbClient = Pick<PrismaClient, "$transaction">;
type TxClient = Prisma.TransactionClient;
type TicketRecord = Ticket;
type TicketActivityRecord = TicketActivity;
type TicketPriority = PrismaTicketPriority;

export interface CreateTicketInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerOrganization?: string;
  subject: string;
  description: string;
  requestTypeId: string;
  priority: TicketPriority;
}

export interface CreateTicketResult {
  ticket: TicketRecord;
  activities: TicketActivityRecord[];
}

function isTicketNumberConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeKnownError = error as {
    code?: string;
    meta?: { target?: string | string[] };
  };

  if (maybeKnownError.code !== "P2002") {
    return false;
  }

  const target = maybeKnownError.meta?.target;
  if (typeof target === "string") {
    return target.includes("ticketNumber");
  }

  if (Array.isArray(target)) {
    return target.includes("ticketNumber");
  }

  return false;
}

async function buildCandidates(db: TxClient, categoryId: string | null): Promise<CandidateAgent[]> {
  const now = new Date();

  const agents = await db.agent.findMany({
    where: {
      isActive: true,
      role: { in: [AgentRole.AGENT, AgentRole.TEAM_LEAD] },
      ...(categoryId
        ? {
          categories: {
            some: { categoryId }
          }
        }
        : {}),
      absences: {
        none: {
          startDate: { lte: now },
          endDate: { gte: now }
        }
      }
    },
    select: {
      id: true,
      name: true,
      maxTickets: true,
      createdAt: true,
      lastAssignedAt: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: {
                in: ACTIVE_STATUSES
              }
            }
          }
        }
      }
    }
  });

  return agents.map((agent) => {
    const currentTickets = agent._count.assignedTickets;
    const loadRatio = agent.maxTickets > 0 ? currentTickets / agent.maxTickets : 1;

    return {
      id: agent.id,
      name: agent.name,
      maxTickets: agent.maxTickets,
      currentTickets,
      loadRatio,
      lastAssignedAt: agent.lastAssignedAt ?? agent.createdAt
    };
  });
}

export async function createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const ticketNumber = await generateTicketNumber();

    try {
      return await prisma.$transaction(async (tx) => {
        // Get request type and its category
        const requestType = await tx.requestType.findUnique({
          where: { id: input.requestTypeId },
          include: { category: true }
        });

        if (!requestType) {
          throw new Error("Invalid request type");
        }

        const categoryId = requestType.categoryId ?? null;
        const candidates = await buildCandidates(tx, categoryId);
        const assignee = pickAssignee(candidates, categoryId ?? undefined);

        const customer = await tx.customer.upsert({
          where: { email: input.customerEmail },
          update: {
            name: input.customerName,
            phone: input.customerPhone ?? null,
            ticketCount: { increment: 1 },
            lastTicketAt: new Date()
          },
          create: {
            email: input.customerEmail,
            name: input.customerName,
            phone: input.customerPhone ?? null,
            ticketCount: 1,
            lastTicketAt: new Date()
          }
        });

        const ticket = await tx.ticket.create({
          data: {
            ticketNumber,
            customerId: customer.id,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone ?? null,
            customerOrganization: input.customerOrganization ?? null,
            subject: input.subject,
            description: input.description,
            categoryId: categoryId ?? null,
            requestTypeId: input.requestTypeId,
            priority: input.priority,
            assigneeId: assignee?.id ?? null
          }
        });

        const activities: TicketActivityRecord[] = [];

        activities.push(
          await logActivity(
            {
              ticketId: ticket.id,
              actorType: "CUSTOMER",
              action: "CREATED"
            },
            tx
          )
        );

        if (assignee) {
          activities.push(
            await logActivity(
              {
                ticketId: ticket.id,
                actorType: "SYSTEM",
                action: "ASSIGNED",
                newValue: assignee.id
              },
              tx
            )
          );

          await tx.agent.update({
            where: { id: assignee.id },
            data: { lastAssignedAt: new Date() }
          });
        }

        return {
          ticket,
          activities
        };
      });
    } catch (error) {
      if (isTicketNumberConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create ticket with a unique ticket number");
}
