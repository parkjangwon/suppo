import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters = await prisma.savedFilter.findMany({
      where: {
        OR: [
          { createdById: session.user.agentId },
          { isShared: true },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(filters);
  } catch (error) {
    console.error("Failed to fetch saved filters:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const filter = await prisma.savedFilter.create({
      data: {
        name: body.name,
        description: body.description,
        filterConfig: body.filterConfig,
        sortConfig: body.sortConfig,
        isDefault: false,
        isShared: false,
        createdById: session.user.agentId,
      },
    });

    return NextResponse.json(filter, { status: 201 });
  } catch (error) {
    console.error("Failed to save filter:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
