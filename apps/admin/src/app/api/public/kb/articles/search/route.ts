import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@suppo/db";

import {
  authenticatePublicApiKey,
  hasPublicApiScope,
} from "@/lib/public-api/auth";

export async function GET(request: NextRequest) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPublicApiScope(apiKey, "tickets:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20"), 1), 100);

  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      isPublished: true,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { excerpt: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      tags: true,
      isPublic: true,
      viewCount: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ articles });
}
