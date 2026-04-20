import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { knowledgeCategorySchema } from "@suppo/shared/validation/knowledge";
import { createAuditLog } from "@/lib/audit/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.knowledgeCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch knowledge categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = knowledgeCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, slug, description, sortOrder, isActive } = parsed.data;

    const existing = await prisma.knowledgeCategory.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this name or slug already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.knowledgeCategory.create({
      data: {
        name,
        slug,
        description,
        sortOrder,
        isActive,
      },
    });

    await createAuditLog({
      action: "CREATE",
      actorId: session.user.agentId,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      resourceType: "knowledge_category",
      resourceId: category.id,
      description: `Created knowledge category: ${name}`,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create knowledge category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
