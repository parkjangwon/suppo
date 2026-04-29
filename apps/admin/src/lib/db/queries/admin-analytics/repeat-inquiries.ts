import { db } from "@suppo/db/raw";
import { DateRange, RepeatInquiry, RepeatPatternType, RepeatInquiryResponse } from "./contracts";

interface RawRepeatInquiry {
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  ticketCount: bigint;
  distinctCategories: bigint;
  firstTicketAt: string;
  lastTicketAt: string;
}

export async function getRepeatInquiries(
  dateRange: DateRange,
  minTickets = 2
): Promise<RepeatInquiryResponse> {
  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  const rawData = await db.execute({
    sql: `
      SELECT
        t.customerId,
        t.customerEmail,
        t.customerName,
        COUNT(*) as ticketCount,
        COUNT(DISTINCT t.categoryId) as distinctCategories,
        MIN(t.createdAt) as firstTicketAt,
        MAX(t.createdAt) as lastTicketAt
      FROM Ticket t
      WHERE t.createdAt >= ?
        AND t.createdAt <= ?
      GROUP BY t.customerId, t.customerEmail, t.customerName
      HAVING COUNT(*) >= ?
      ORDER BY COUNT(*) DESC
    `,
    args: [fromISO, toISO, minTickets],
  });
  const typedRawData: RawRepeatInquiry[] = rawData.rows as RawRepeatInquiry[];

  const customers: RepeatInquiry[] = typedRawData.map((row) => {
    const distinctCategoriesNum = Number(row.distinctCategories);
    let patternType: RepeatPatternType;
    if (distinctCategoriesNum === 1) {
      patternType = "same-category";
    } else if (distinctCategoriesNum >= 3) {
      patternType = "cross-category";
    } else {
      patternType = "mixed";
    }

    return {
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      ticketCount: Number(row.ticketCount),
      distinctCategories: Number(row.distinctCategories),
      firstTicketAt: new Date(row.firstTicketAt),
      lastTicketAt: new Date(row.lastTicketAt),
      patternType,
    };
  });

  return {
    customers,
    totalRepeatCustomers: customers.length,
  };
}
