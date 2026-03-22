import { prisma } from "@crinity/db";
import { DateRange, CategoryFrequency, CategoryFrequencyResponse } from "./contracts";

export async function getCategoryFrequency(
  dateRange: DateRange
): Promise<CategoryFrequencyResponse> {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const ticketCounts = await prisma.ticket.groupBy({
    by: ["categoryId"],
    where: {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _count: {
      id: true,
    },
  });

  const countMap = new Map(
    ticketCounts.map((t) => [t.categoryId, t._count.id])
  );

  const totalTickets = ticketCounts.reduce((sum, t) => sum + t._count.id, 0);

  const categoryData: CategoryFrequency[] = categories.map((cat) => {
    const count = countMap.get(cat.id) ?? 0;
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      ticketCount: count,
      sharePercent: totalTickets > 0 ? (count / totalTickets) * 100 : 0,
    };
  });

  const uncategorizedCount = countMap.get(null) ?? 0;
  if (uncategorizedCount > 0) {
    categoryData.push({
      categoryId: null,
      categoryName: "미분류",
      ticketCount: uncategorizedCount,
      sharePercent: totalTickets > 0 ? (uncategorizedCount / totalTickets) * 100 : 0,
    });
  }

  categoryData.sort((a, b) => b.ticketCount - a.ticketCount);

  return {
    categories: categoryData,
    totalTickets,
  };
}
