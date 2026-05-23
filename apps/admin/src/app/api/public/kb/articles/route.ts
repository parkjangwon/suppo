import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@suppo/db";

import {
  authenticatePublicApiKey,
  hasPublicApiScope,
} from "@/lib/public-api/auth";

const createKbArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPublicApiScope(apiKey, "kb:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rawBody = await request.json();
    const validated = createKbArticleSchema.parse(rawBody);

    let categoryId = validated.categoryId;
    if (!categoryId) {
      const defaultCategory = await prisma.knowledgeCategory.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });
      if (!defaultCategory) {
        return NextResponse.json(
          { error: "No knowledge base category available. Create one first." },
          { status: 422 }
        );
      }
      categoryId = defaultCategory.id;
    }

    const slug = `${validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now()}`;

    const article = await prisma.knowledgeArticle.create({
      data: {
        title: validated.title,
        slug,
        content: validated.content,
        excerpt: validated.content.slice(0, 200),
        categoryId,
        authorId: apiKey.createdById,
        tags: validated.tags ?? [],
        isPublished: false,
        isPublic: false,
      },
    });

    return NextResponse.json(
      {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        createdAt: article.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    console.error("Failed to create KB article from public api:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
