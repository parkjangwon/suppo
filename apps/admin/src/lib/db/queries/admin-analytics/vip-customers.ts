import { prisma } from "@crinity/db";
import { db } from "@crinity/db/raw";
import { DateRange, VIPCustomer, VIPReason, VIPCustomerResponse } from "./contracts";

interface RawVIPData {
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  recentTickets: bigint;
  lifetimeTickets: bigint;
  highPriorityTickets: bigint;
}

export async function getVIPCustomers(
  dateRange: DateRange,
  minRecentTickets = 5,
  minLifetimeTickets = 10,
  minHighPriorityTickets = 3
): Promise<VIPCustomerResponse> {
  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();
  const ninetyDaysAgo = new Date(dateRange.to);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysISO = ninetyDaysAgo.toISOString();

  const rawData = await db.execute({
    sql: `
      SELECT
        t.customerId,
        t.customerEmail,
        t.customerName,
        SUM(CASE WHEN t.createdAt >= ? THEN 1 ELSE 0 END) as recentTickets,
        COUNT(*) as lifetimeTickets,
        SUM(CASE
          WHEN t.createdAt >= ?
          AND t.priority IN ('URGENT', 'HIGH')
          THEN 1 ELSE 0 END) as highPriorityTickets
      FROM Ticket t
      WHERE t.createdAt <= ?
      GROUP BY t.customerId, t.customerEmail, t.customerName
      HAVING recentTickets >= ?
         OR lifetimeTickets >= ?
         OR highPriorityTickets >= ?
      ORDER BY recentTickets DESC, lifetimeTickets DESC
    `,
    args: [ninetyDaysISO, ninetyDaysISO, toISO, minRecentTickets, minLifetimeTickets, minHighPriorityTickets],
  });
  const typedRawData: RawVIPData[] = rawData.rows as RawVIPData[];

  const customers: VIPCustomer[] = typedRawData.map((row) => {
    const reasons: VIPReason[] = [];
    if (Number(row.recentTickets) >= minRecentTickets) {
      reasons.push("high-volume");
    }
    if (Number(row.highPriorityTickets) >= minHighPriorityTickets) {
      reasons.push("high-priority");
    }
    if (Number(row.lifetimeTickets) >= minLifetimeTickets) {
      reasons.push("long-term");
    }

    const vipScore = 
      Number(row.recentTickets) * 2 + 
      Number(row.highPriorityTickets) * 2 + 
      Math.min(Number(row.lifetimeTickets) / 10, 10);

    return {
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      recentTickets: Number(row.recentTickets),
      lifetimeTickets: Number(row.lifetimeTickets),
      highPriorityTickets: Number(row.highPriorityTickets),
      vipScore: Math.round(vipScore),
      vipReasons: reasons,
    };
  });

  customers.sort((a, b) => b.vipScore - a.vipScore);

  return {
    customers,
  };
}
