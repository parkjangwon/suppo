import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@crinity/db";
import { Prisma } from "@prisma/client";
import { knowledgeSearchSchema } from "@crinity/shared/validation/knowledge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const parsed = knowledgeSearchSchema.safeParse({
      q: searchParams.get("q") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      tags: searchParams.getAll("tags"),
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search parameters" },
        { status: 400 }
      );
    }

    const { q, categoryId, limit, offset } = parsed.data;

    const where: Prisma.KnowledgeArticleWhereInput = {
      isPublished: true,
      isPublic: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { content: { contains: q } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
        skip: offset,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);

    return NextResponse.json({
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        tags: article.tags as string[],
        viewCount: article.viewCount,
        updatedAt: article.updatedAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to search knowledge articles:", error);
    return NextResponse.json(
      { error: "Failed to search articles" },
      { status: 500 }
    );
  }
}
