import { prisma } from "@suppo/db";
import { DateRange, CustomerReportData, CustomerSummary, TicketSummary } from "../contracts";

export async function getCustomerReportData(
  period: DateRange
): Promise<CustomerReportData> {
  const customers = await prisma.customer.findMany({
    where: {
      tickets: {
        some: {
          createdAt: {
            gte: period.from,
            lte: period.to,
          },
        },
      },
    },
    include: {
      tickets: {
        where: {
          createdAt: {
            gte: period.from,
            lte: period.to,
          },
        },
        include: {
          assignee: {
            select: { name: true },
          },
          comments: {
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const customerSummaries: CustomerSummary[] = customers.map((customer) => {
    const tickets = customer.tickets;
    const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");

    const ticketSummaries: TicketSummary[] = tickets.map((ticket) => ({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
      responseTime: calculateResponseTime(ticket),
      resolutionTime: calculateResolutionTime(ticket),
    }));

    const avgResponseTime =
      ticketSummaries.reduce((sum, t) => sum + (t.responseTime || 0), 0) /
      (ticketSummaries.filter((t) => t.responseTime !== null).length || 1);

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      ticketCount: tickets.length,
      resolvedTickets: resolvedTickets.length,
      averageResponseTime: Math.round(avgResponseTime),
      lastTicketAt: tickets[0]?.createdAt || null,
      tickets: ticketSummaries,
    };
  });

  const totalTickets = customerSummaries.reduce((sum, c) => sum + c.ticketCount, 0);
  const resolvedTickets = customerSummaries.reduce((sum, c) => sum + c.resolvedTickets, 0);
  const avgResponseTime =
    customerSummaries.reduce((sum, c) => sum + c.averageResponseTime, 0) /
    (customerSummaries.length || 1);

  return {
    period,
    summary: {
      totalCustomers: customers.length,
      activeCustomers: customers.filter((c) => c.tickets.length > 0).length,
      newCustomers: 0,
      totalTickets,
      resolvedTickets,
      averageResponseTime: Math.round(avgResponseTime),
      averageResolutionTime: 0,
    },
    customers: customerSummaries.sort((a, b) => b.ticketCount - a.ticketCount),
  };
}

type TicketWithComments = {
  createdAt: Date;
  resolvedAt: Date | null;
  comments: { createdAt: Date }[];
};

function calculateResponseTime(ticket: TicketWithComments): number | null {
  const firstComment = ticket.comments?.[0];
  if (!firstComment) return null;

  const created = new Date(ticket.createdAt).getTime();
  const responded = new Date(firstComment.createdAt).getTime();
  return Math.round((responded - created) / (1000 * 60));
}

function calculateResolutionTime(ticket: TicketWithComments): number | null {
  if (!ticket.resolvedAt) return null;

  const created = new Date(ticket.createdAt).getTime();
  const resolved = new Date(ticket.resolvedAt).getTime();
  return Math.round((resolved - created) / (1000 * 60));
}
