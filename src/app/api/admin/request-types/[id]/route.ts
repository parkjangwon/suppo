import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  channel: z.enum(["WEB", "EMAIL", "API", "IN_APP"]).optional(),
  defaultPriority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  defaultTeamId: z.string().optional().nullable(),
  autoAssignEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
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
    const validated = updateSchema.parse(body);

    const requestType = await prisma.requestType.update({
      where: { id },
      data: validated,
      include: {
        defaultTeam: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(requestType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update request type:", error);
    return NextResponse.json(
      { error: "Failed to update request type" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 연결된 티켓이 있는지 확인
    const requestType = await prisma.requestType.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true } } },
    });

    if (requestType && requestType._count.tickets > 0) {
      // 티켓이 있으면 비활성화만 수행
      await prisma.requestType.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ 
        message: "비활성화되었습니다 (연결된 티켓이 있어 삭제할 수 없습니다)" 
      });
    }

    await prisma.requestType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete request type:", error);
    return NextResponse.json(
      { error: "Failed to delete request type" },
      { status: 500 }
    );
  }
}
