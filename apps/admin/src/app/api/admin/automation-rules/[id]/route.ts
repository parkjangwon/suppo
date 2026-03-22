import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { z } from "zod";

const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  conditions: z.record(z.any()).optional(),
  actions: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
  triggerOn: z.string().min(1).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateAutomationRuleSchema.parse(body);

    const updated = await prisma.automationRule.update({
      where: { id },
      data: {
        ...data,
        description: data.description ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }

    console.error("Failed to update automation rule:", error);
    return NextResponse.json({ error: "Failed to update automation rule" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.automationRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete automation rule:", error);
    return NextResponse.json({ error: "Failed to delete automation rule" }, { status: 500 });
  }
}
