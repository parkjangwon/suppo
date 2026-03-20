import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { knowledgeCategorySchema } from "@/lib/validation/knowledge";
import { createAuditLog } from "@/lib/audit/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
      where: {
        OR: [{ name }, { slug }],
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this name or slug already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.knowledgeCategory.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        sortOrder,
        isActive,
      },
    });

    await createAuditLog({
      action: "UPDATE",
      actorId: session.user.agentId,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      resourceType: "knowledge_category",
      resourceId: category.id,
      description: `Updated knowledge category: ${name}`,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update knowledge category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const articlesCount = await prisma.knowledgeArticle.count({
      where: { categoryId: id },
    });

    if (articlesCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with articles. Move or delete articles first." },
        { status: 409 }
      );
    }

    const category = await prisma.knowledgeCategory.delete({
      where: { id },
    });

    await createAuditLog({
      action: "DELETE",
      actorId: session.user.agentId,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      resourceType: "knowledge_category",
      resourceId: id,
      description: `Deleted knowledge category: ${category.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete knowledge category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
