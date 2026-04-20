import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { createAuditLog } from "@/lib/audit/logger";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createCustomerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "유효한 이메일 형식이 아닙니다"),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  memo: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = listQuerySchema.parse({
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? "1",
      limit: request.nextUrl.searchParams.get("limit") ?? "20",
    });

    const where = params.search
      ? {
          OR: [
            { email: { contains: params.search } },
            { name: { contains: params.search } },
          ],
        }
      : undefined;

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ lastTicketAt: "desc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: {
              tickets: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      customers: customers.map((customer) => ({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        memo: customer.memo,
        analysis: customer.analysis,
        analyzedAt: customer.analyzedAt,
        ticketCount: customer._count.tickets,
        lastTicketAt: customer.lastTicketAt,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      })),
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
        { status: 400 },
      );
    }

    console.error("Failed to fetch customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: validated,
    });

    await createAuditLog({
      actorId: session.user.id!,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "CREATE",
      resourceType: "customer",
      resourceId: customer.id,
      description: `고객 생성: ${customer.name} (${customer.email})`,
      newValue: customer
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 존재하는 이메일입니다" }, { status: 409 });
    }

    console.error("Failed to create customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
