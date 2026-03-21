import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const feedbackSchema = z.object({
  wasHelpful: z.boolean(),
  comment: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    const article = await prisma.knowledgeArticle.findFirst({
      where: { id: articleId, isPublished: true },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const cookieStore = await cookies();
    let sessionToken = cookieStore.get("kb-session")?.value;

    const response = NextResponse.json({ success: true });

    if (!sessionToken) {
      sessionToken = randomUUID();
      response.cookies.set("kb-session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1년
        path: "/",
      });
    }

    await prisma.knowledgeArticleFeedback.upsert({
      where: { articleId_sessionToken: { articleId, sessionToken } },
      create: {
        articleId,
        sessionToken,
        wasHelpful: parsed.data.wasHelpful,
        comment: parsed.data.comment,
      },
      update: {
        wasHelpful: parsed.data.wasHelpful,
        comment: parsed.data.comment,
      },
    });

    return response;
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
