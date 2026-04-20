import { prisma } from "@suppo/db";

export interface Customer360Data {
  customerId: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageCsat: number | null;
  firstContact: Date | null;
  lastContact: Date | null;
  healthScore: number;
  isVip: boolean;
  ticketTrend: "increasing" | "decreasing" | "stable";
}

export async function getCustomer360Data(customerEmail: string): Promise<Customer360Data | null> {
  const tickets = await prisma.ticket.findMany({
    where: { customerEmail },
    orderBy: { createdAt: "asc" },
    include: {
      satisfactions: true
    }
  });

  if (tickets.length === 0) {
    return null;
  }

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => 
    ["OPEN", "IN_PROGRESS", "WAITING"].includes(t.status)
  ).length;
  const resolvedTickets = tickets.filter(t => t.status === "RESOLVED").length;

  const csatScores = tickets
    .flatMap(t => t.satisfactions?.map(s => s.rating) ?? [])
    .filter((rating): rating is number => rating !== null && rating !== undefined);
  
  const averageCsat = csatScores.length > 0
    ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
    : null;

  const firstContact = tickets[0]?.createdAt ?? null;
  const lastContact = tickets[tickets.length - 1]?.createdAt ?? null;

  // Health score calculation (0-100)
  // Factors: resolution rate, CSAT, ticket frequency
  const resolutionRate = totalTickets > 0 ? resolvedTickets / totalTickets : 0;
  const csatScore = averageCsat ? averageCsat / 5 : 0.5; // Normalize to 0-1
  
  // Recent ticket trend (last 30 days vs previous 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const recentTickets = tickets.filter(t => t.createdAt >= thirtyDaysAgo).length;
  const previousTickets = tickets.filter(
    t => t.createdAt >= sixtyDaysAgo && t.createdAt < thirtyDaysAgo
  ).length;
  
  let ticketTrend: "increasing" | "decreasing" | "stable" = "stable";
  if (recentTickets > previousTickets * 1.2) ticketTrend = "increasing";
  else if (recentTickets < previousTickets * 0.8) ticketTrend = "decreasing";

  // Calculate health score
  const trendPenalty = ticketTrend === "increasing" ? 0.2 : 0;
  const healthScore = Math.round(
    (resolutionRate * 40 + csatScore * 40 + (1 - trendPenalty) * 20)
  );

  // VIP determination (high value or frequent contact)
  const isVip = totalTickets > 10 || healthScore > 80;

  return {
    customerId: tickets[0].customerId ?? customerEmail,
    totalTickets,
    openTickets,
    resolvedTickets,
    averageCsat,
    firstContact,
    lastContact,
    healthScore,
    isVip,
    ticketTrend
  };
}
