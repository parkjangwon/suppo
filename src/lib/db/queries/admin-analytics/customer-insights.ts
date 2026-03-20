import { prisma } from "@/lib/db/client";
import { CustomerInsightsResponse } from "./contracts";

export async function getCustomerInsights(customerId: string): Promise<CustomerInsightsResponse | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      ticketCount: true,
      lastTicketAt: true,
    },
  });

  if (!customer) {
    return null;
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const ticketIds = tickets.map((t) => t.id);

  const [csatStats, categoryBreakdown, responseTimeStats, resolutionTimeStats] = await Promise.all([
    prisma.customerSatisfaction.aggregate({
      where: {
        ticketId: { in: ticketIds },
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.ticket.groupBy({
      by: ["categoryId"],
      where: {
        customerId,
      },
      _count: {
        id: true,
      },
    }),
    prisma.$queryRaw<{ avgMinutes: number | null }[]>`
      SELECT AVG((julianday("firstResponseAt") - julianday("createdAt")) * 1440) as "avgMinutes"
      FROM "Ticket"
      WHERE "customerId" = ${customerId}
        AND "firstResponseAt" IS NOT NULL
    `,
    prisma.$queryRaw<{ avgHours: number | null }[]>`
      SELECT AVG((julianday(COALESCE("resolvedAt", "closedAt")) - julianday("createdAt")) * 24) as "avgHours"
      FROM "Ticket"
      WHERE "customerId" = ${customerId}
        AND ("resolvedAt" IS NOT NULL OR "closedAt" IS NOT NULL)
    `,
  ]);

  const categoryMap = new Map(
    categoryBreakdown.map((c) => [c.categoryId, c._count.id])
  );

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const openTickets = tickets.filter((t) =>
    ["OPEN", "IN_PROGRESS", "WAITING"].includes(t.status)
  ).length;

  const resolvedTickets = tickets.filter((t) =>
    t.status === "RESOLVED" || t.status === "CLOSED"
  ).length;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      ticketCount: customer.ticketCount,
      lastTicketAt: customer.lastTicketAt,
    },
    stats: {
      totalTickets: tickets.length,
      openTickets,
      resolvedTickets,
      avgFirstResponseMinutes: responseTimeStats[0]?.avgMinutes ?? null,
      avgResolutionHours: resolutionTimeStats[0]?.avgHours ?? null,
      avgCsat: csatStats._avg.rating,
      csatResponses: csatStats._count.id,
      lastTicketAt: customer.lastTicketAt,
    },
    categoryBreakdown: [
      ...categories
        .filter((cat) => categoryMap.has(cat.id))
        .map((cat) => ({
          categoryId: cat.id,
          categoryName: cat.name,
          ticketCount: categoryMap.get(cat.id) ?? 0,
        })),
      ...(categoryMap.has(null)
        ? [{
            categoryId: "uncategorized" as const,
            categoryName: "미분류",
            ticketCount: categoryMap.get(null) ?? 0,
          }]
        : []),
    ].sort((a, b) => b.ticketCount - a.ticketCount),
    tickets: tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
      csatRating: null,
    })),
  };
}
