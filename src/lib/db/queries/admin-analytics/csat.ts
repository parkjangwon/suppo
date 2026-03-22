import { prisma } from "@/lib/db/client";
import { db } from "@/lib/db/raw";
import { DateRange, CSATBucket, CSATTrendResponse } from "./contracts";

interface RawCSATBucket {
  bucket: string;
  avgRating: number;
  responseCount: bigint;
  positiveCount: bigint;
}

export async function getCSATTrend(
  dateRange: DateRange,
  granularity: "day" | "week" | "month" = "day"
): Promise<CSATTrendResponse> {
  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  let bucketExpression: string;
  switch (granularity) {
    case "week":
      bucketExpression = `strftime('%Y-W%W', "submittedAt")`;
      break;
    case "month":
      bucketExpression = `strftime('%Y-%m', "submittedAt")`;
      break;
    case "day":
    default:
      bucketExpression = `strftime('%Y-%m-%d', "submittedAt")`;
      break;
  }

  const buckets = await db.execute({
    sql: `
      SELECT
        ${bucketExpression} as bucket,
        AVG(rating) as avgRating,
        COUNT(*) as responseCount,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positiveCount
      FROM CustomerSatisfaction
      WHERE submittedAt >= ?
        AND submittedAt <= ?
      GROUP BY ${bucketExpression}
      ORDER BY ${bucketExpression} ASC
    `,
    args: [fromISO, toISO],
  });
  const typedBuckets: RawCSATBucket[] = buckets.rows as RawCSATBucket[];

  const trend: CSATBucket[] = typedBuckets.map((b) => ({
    bucket: b.bucket,
    avgRating: Number(b.avgRating),
    responseCount: Number(b.responseCount),
    positiveRate: b.responseCount > 0
      ? (Number(b.positiveCount) / Number(b.responseCount)) * 100
      : 0,
  }));

  const allRatings = await prisma.customerSatisfaction.aggregate({
    where: {
      submittedAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  const positiveCount = await prisma.customerSatisfaction.count({
    where: {
      submittedAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
      rating: {
        gte: 4,
      },
    },
  });

  const totalResponses = allRatings._count.id;

  return {
    trend,
    summary: {
      avgRating: allRatings._avg.rating,
      totalResponses,
      positiveRate: totalResponses > 0 ? (positiveCount / totalResponses) * 100 : null,
    },
  };
}
