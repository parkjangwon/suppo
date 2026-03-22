import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { updateKnowledgeArticleSchema } from "@crinity/shared/validation/knowledge";
import { generateSlug } from "@crinity/shared/knowledge/slug";
import { createAuditLog } from "@/lib/audit/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true, email: true },
        },
        lastEditedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Failed to fetch knowledge article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

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

    const parsed = updateKnowledgeArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, content, excerpt, categoryId, tags, isPublic, isPublished } = parsed.data;

    const existingArticle = await prisma.knowledgeArticle.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    let slug = existingArticle.slug;
    if (title !== existingArticle.title) {
      slug = generateSlug(title);
      const slugExists = await prisma.knowledgeArticle.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        categoryId,
        tags,
        isPublic,
        isPublished,
        publishedAt: isPublished && !existingArticle.publishedAt ? new Date() : existingArticle.publishedAt,
        lastEditedById: session.user.agentId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true },
        },
        lastEditedBy: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      action: "UPDATE",
      actorId: session.user.agentId,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      resourceType: "knowledge_article",
      resourceId: article.id,
      description: `Updated knowledge article: ${title}`,
      metadata: { title, slug, categoryId, isPublished },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error("Failed to update knowledge article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
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

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await prisma.knowledgeArticle.delete({ where: { id } });

    await createAuditLog({
      action: "DELETE",
      actorId: session.user.agentId,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      resourceType: "knowledge_article",
      resourceId: id,
      description: `Deleted knowledge article: ${article.title}`,
      metadata: { title: article.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete knowledge article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
