import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { createAuditLog } from "@/lib/audit/logger";

const updateMemoSchema = z
  .object({
    memo: z.string().trim().max(10000).nullable(),
  })
  .strict();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            customerOrganization: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get organization from the most recent ticket
    const latestTicket = customer.tickets[0];
    const organization = latestTicket?.customerOrganization || null;

    return NextResponse.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      organization,
      memo: customer.memo,
      analysis: customer.analysis,
      analyzedAt: customer.analyzedAt,
      ticketCount: customer._count.tickets,
      lastTicketAt: customer.lastTicketAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      tickets: customer.tickets,
    });
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateMemoSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        memo: validated.memo,
      },
    });

    await createAuditLog({
      actorId: session.user.id!,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "UPDATE",
      resourceType: "customer",
      resourceId: customer.id,
      description: `고객 메모 수정: ${customer.name} (${customer.email})`,
      newValue: { memo: customer.memo }
    });

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    console.error("Failed to update customer memo:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
