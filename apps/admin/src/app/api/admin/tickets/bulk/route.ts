import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { bulkUpdateTickets } from "@/lib/tickets/bulk-update";

const bulkUpdateSchema = z
  .object({
    ticketIds: z.array(z.string().min(1)).min(1),
    status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priority !== undefined ||
      value.assigneeId !== undefined,
    {
      message: "변경할 항목이 없습니다",
      path: ["ticketIds"],
    }
  );

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = bulkUpdateSchema.parse(body);

    const result = await bulkUpdateTickets({
      ticketIds: validated.ticketIds,
      actorId: session.user.agentId,
      updates: {
        ...(validated.status ? { status: validated.status } : {}),
        ...(validated.priority ? { priority: validated.priority } : {}),
        ...(validated.assigneeId !== undefined ? { assigneeId: validated.assigneeId } : {}),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "잘못된 요청입니다",
        },
        { status: 400 }
      );
    }

    console.error("Failed to bulk update tickets:", error);
    return NextResponse.json({ error: "Failed to bulk update tickets" }, { status: 500 });
  }
}
