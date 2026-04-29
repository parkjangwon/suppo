import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Prisma, TicketStatus, TicketPriority } from "@prisma/client";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  assigneeId: z.array(z.string()).optional(),
  categoryId: z.array(z.string()).optional(),
  requestTypeId: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  customerEmail: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().max(100).default(20),
});

/**
 * 고급 티켓 검색 API
 * - PostgreSQL full-text search 지원
 * - 다중 필터링, 정렬, 페이지네이션
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = searchSchema.parse({
      query: searchParams.get("query") || undefined,
      status: searchParams.getAll("status"),
      priority: searchParams.getAll("priority"),
      assigneeId: searchParams.getAll("assigneeId"),
      categoryId: searchParams.getAll("categoryId"),
      requestTypeId: searchParams.getAll("requestTypeId"),
      tags: searchParams.getAll("tags"),
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      customerEmail: searchParams.get("customerEmail") || undefined,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    const where: Prisma.TicketWhereInput = {};
    const andClauses: Prisma.TicketWhereInput[] = [];

    // Full-text search
    if (params.query) {
      // PostgreSQL full-text search 사용
      where.OR = [
        {
          searchVector: {
            contains: params.query,
          },
        },
        {
          ticketNumber: {
            contains: params.query,
          },
        },
        {
          customerName: {
            contains: params.query,
          },
        },
        {
          customerEmail: {
            contains: params.query,
          },
        },
        {
          subject: {
            contains: params.query,
          },
        },
        {
          description: {
            contains: params.query,
          },
        },
      ];
    }

    // Status filter
    if (params.status && params.status.length > 0) {
      where.status = { in: params.status as TicketStatus[] };
    }

    // Priority filter
    if (params.priority && params.priority.length > 0) {
      where.priority = { in: params.priority as TicketPriority[] };
    }

    // Assignee filter
    if (params.assigneeId && params.assigneeId.length > 0) {
      where.assigneeId = { in: params.assigneeId };
    }

    // Category filter
    if (params.categoryId && params.categoryId.length > 0) {
      where.categoryId = { in: params.categoryId };
    }

    // Request type filter
    if (params.requestTypeId && params.requestTypeId.length > 0) {
      where.requestTypeId = { in: params.requestTypeId };
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      andClauses.push(...params.tags.map((tag) => ({ tags: { contains: tag } })));
    }

    // Date range filter
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    // Customer email filter
    if (params.customerEmail) {
      where.customerEmail = {
        contains: params.customerEmail,
      };
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    // 권한에 따른 필터링
    if (session.user.role === "AGENT") {
      // 상담원은 자신의 티켓만 볼 수 있음 (또는 관리자가 설정한 정책에 따라)
      // 여기서는 모든 상담원이 모든 티켓을 볼 수 있도록 설정
    }

    // 정렬 설정
    const orderBy: Prisma.TicketOrderByWithRelationInput =
      params.sortBy === "priority"
        ? { priority: params.sortOrder }
        : params.sortBy === "updatedAt"
          ? { updatedAt: params.sortOrder }
          : { createdAt: params.sortOrder };

    // 총 개수 조회
    const total = await prisma.ticket.count({ where });

    // 티켓 조회
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: {
        category: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        requestType: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    return NextResponse.json({
      tickets,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
