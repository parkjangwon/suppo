import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = request.nextUrl.searchParams.get("scope");

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

    const scopedFilters =
      scope === null
        ? filters
        : filters.filter((filter) => {
            const config =
              filter.filterConfig && typeof filter.filterConfig === "object"
                ? (filter.filterConfig as Record<string, unknown>)
                : {};
            return config.scope === scope;
          });

    return NextResponse.json(scopedFilters);
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
        isShared: Boolean(body.isShared),
        createdById: session.user.agentId,
      },
    });

    return NextResponse.json(filter, { status: 201 });
  } catch (error) {
    console.error("Failed to save filter:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
