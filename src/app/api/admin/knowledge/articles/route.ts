import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import {
  createKnowledgeArticleSchema,
  updateKnowledgeArticleSchema,
} from "@/lib/validation/knowledge";
import { generateSlug } from "@/lib/knowledge/slug";
import { createAuditLog } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status === "published") {
      where.isPublished = true;
    } else if (status === "draft") {
      where.isPublished = false;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
      ];
    }

    const articles = await prisma.knowledgeArticle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { feedback: true },
        },
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Failed to fetch knowledge articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
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
    const parsed = createKnowledgeArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, content, excerpt, categoryId, tags, isPublic } = parsed.data;

    let slug = generateSlug(title);
    const existingSlug = await prisma.knowledgeArticle.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const article = await prisma.knowledgeArticle.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        categoryId,
        tags,
        isPublic,
        isPublished: false,
        authorId: session.user.agentId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      action: "CREATE",
      actorId: session.user.agentId,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      resourceType: "knowledge_article",
      resourceId: article.id,
      description: `Created knowledge article: ${title}`,
      metadata: { title, slug, categoryId },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Failed to create knowledge article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
