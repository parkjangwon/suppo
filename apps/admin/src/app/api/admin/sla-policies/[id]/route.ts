import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { z } from "zod";

const updatePolicySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  firstResponseHours: z.number().min(0.1).optional(),
  resolutionHours: z.number().min(0.1).optional(),
  isActive: z.boolean().optional(),
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
    const data = updatePolicySchema.parse(body);

    const existing = await prisma.sLAPolicy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextPriority = data.priority ?? existing.priority;
    const nextActive = data.isActive ?? existing.isActive;

    if (nextActive) {
      await prisma.sLAPolicy.updateMany({
        where: {
          priority: nextPriority,
          isActive: true,
          NOT: { id },
        },
        data: { isActive: false },
      });
    }

    const updated = await prisma.sLAPolicy.update({
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

    console.error("Failed to update SLA policy:", error);
    return NextResponse.json({ error: "Failed to update SLA policy" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.sLAPolicy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete SLA policy:", error);
    return NextResponse.json({ error: "Failed to delete SLA policy" }, { status: 500 });
  }
}
