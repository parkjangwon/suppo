import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { z } from "zod";

const requestTypeSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  description: z.string().optional(),
  channel: z.enum(["WEB", "EMAIL", "API", "IN_APP"]).default("WEB"),
  defaultPriority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  defaultTeamId: z.string().optional(),
  autoAssignEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export async function GET() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestTypes = await prisma.requestType.findMany({
      include: {
        defaultTeam: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(requestTypes);
  } catch (error) {
    console.error("Failed to fetch request types:", error);
    return NextResponse.json(
      { error: "Failed to fetch request types" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = requestTypeSchema.parse(body);

    const requestType = await prisma.$transaction(async (tx) => {
      // Create linked Category for agent specialization
      const category = await tx.category.create({
        data: {
          name: validated.name,
          description: validated.description,
          sortOrder: validated.sortOrder,
        },
      });

      // Create RequestType with link to Category
      return await tx.requestType.create({
        data: {
          ...validated,
          categoryId: category.id,
        },
        include: {
          defaultTeam: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      });
    });

    return NextResponse.json(requestType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "이미 존재하는 이름입니다" },
        { status: 409 }
      );
    }

    console.error("Failed to create request type:", error);
    return NextResponse.json(
      { error: "Failed to create request type" },
      { status: 500 }
    );
  }
}
