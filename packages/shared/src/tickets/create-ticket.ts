import { pickAssignee, type CandidateAgent } from "@crinity/shared/assignment/pick-assignee";
import { prisma } from "@crinity/db";
import { logActivity } from "@crinity/shared/tickets/activity";
import { generateTicketNumber } from "@crinity/shared/tickets/ticket-number";

const ACTIVE_STATUSES: Array<"OPEN" | "IN_PROGRESS" | "WAITING"> = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING"
];
const MAX_CREATE_ATTEMPTS = 5;

type TicketPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

interface TicketRecord {
  id: string;
  ticketNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  subject: string;
  description: string;
  categoryId: string;
  priority: TicketPriority;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

interface TicketActivityRecord {
  id: string;
  ticketId: string;
  actorType: "AGENT" | "CUSTOMER";
  actorId: string | null;
  action: "CREATED" | "ASSIGNED" | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "TRANSFERRED";
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

interface CandidateAgentRow {
  id: string;
  name: string;
  maxTickets: number;
  createdAt: Date;
  lastAssignedAt: Date | null;
  _count: {
    assignedTickets: number;
  };
}

interface CandidateQueryClient {
  agent: {
    findMany: (args: {
      where: {
        isActive: true;
        role: "AGENT";
        categories: { some: { categoryId: string } };
      };
      select: {
        id: true;
        name: true;
        maxTickets: true;
        createdAt: true;
        lastAssignedAt: true;
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: Array<"OPEN" | "IN_PROGRESS" | "WAITING">;
                };
              };
            };
          };
        };
      };
    }) => Promise<CandidateAgentRow[]>;
  };
}

interface CreateTicketTxClient extends CandidateQueryClient {
  customer: {
    upsert: (args: {
      where: { email: string };
      update: {
        name: string;
        phone?: string | null;
        ticketCount: { increment: number };
        lastTicketAt: Date;
      };
      create: {
        email: string;
        name: string;
        phone?: string | null;
        ticketCount: number;
        lastTicketAt: Date;
      };
    }) => Promise<{ id: string }>;
  };
  ticket: {
    create: (args: {
      data: {
        ticketNumber: string;
        customerId?: string;
        customerName: string;
        customerEmail: string;
        customerPhone?: string;
        customerOrganization?: string;
        subject: string;
        description: string;
        categoryId: string;
        requestTypeId?: string;
        priority: TicketPriority;
        assigneeId?: string;
      };
    }) => Promise<TicketRecord>;
  };
  requestType: {
    findUnique: (args: { where: { id: string }; include?: { category?: boolean } }) => Promise<{ id: string; categoryId?: string | null; category?: { id: string } | null } | null>;
  };
  agent: CandidateQueryClient["agent"] & {
    update: (args: { where: { id: string }; data: { lastAssignedAt: Date } }) => Promise<unknown>;
  };
  ticketActivity: {
    create: (args: {
      data: {
        ticketId: string;
        actorType: "AGENT" | "CUSTOMER";
        actorId?: string;
        action: "CREATED" | "ASSIGNED" | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "TRANSFERRED";
        oldValue?: string;
        newValue?: string;
      };
    }) => Promise<TicketActivityRecord>;
  };
}

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

async function buildCandidates(db: CandidateQueryClient, categoryId: string | null): Promise<CandidateAgent[]> {
  const now = new Date();

  const agents = await db.agent.findMany({
      where: {
        isActive: true,
        role: { in: ["AGENT", "TEAM_LEAD"] },
        ...(categoryId ? {
          categories: {
            some: { categoryId }
        }
      } : {}),
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
      return await prisma.$transaction(async (tx: CreateTicketTxClient) => {
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
            phone: input.customerPhone,
            ticketCount: { increment: 1 },
            lastTicketAt: new Date()
          },
          create: {
            email: input.customerEmail,
            name: input.customerName,
            phone: input.customerPhone,
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
            customerPhone: input.customerPhone,
            customerOrganization: input.customerOrganization,
            subject: input.subject,
            description: input.description,
            categoryId: categoryId,
            requestTypeId: input.requestTypeId,
            priority: input.priority,
            assigneeId: assignee?.id
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
