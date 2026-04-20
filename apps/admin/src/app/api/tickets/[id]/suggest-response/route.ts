import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { generateResponseSuggestion } from "@/lib/ai/suggestion-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        requestType: true,
        comments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const result = await generateResponseSuggestion({
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category?.name,
      requestType: ticket.requestType?.name,
      priority: ticket.priority,
      comments: ticket.comments.map((c) => ({
        content: c.content,
        authorType: c.authorType,
        createdAt: c.createdAt,
      })),
    });

    if (!result) {
      return NextResponse.json({ error: "AI not available" }, { status: 503 });
    }

    // 기여 문서 TicketKnowledgeLink 자동 생성 (AI_SUGGESTION)
    const agentId = (session.user as { id?: string }).id;
    let referencedArticles: { id: string; title: string }[] = [];

    if (result.referencedArticleIds.length > 0) {
      const articles = await prisma.knowledgeArticle.findMany({
        where: { id: { in: result.referencedArticleIds } },
        select: { id: true, title: true },
      });
      referencedArticles = articles;

      if (agentId) {
        await Promise.allSettled(
          result.referencedArticleIds.map((articleId) =>
            prisma.ticketKnowledgeLink.upsert({
              where: { ticketId_articleId: { ticketId: id, articleId } },
              create: {
                ticketId: id,
                articleId,
                agentId,
                linkType: "AI_SUGGESTION",
              },
              update: {},
            })
          )
        );
      }
    }

    return NextResponse.json({
      suggestion: result.suggestion,
      referencedArticles,
    });
  } catch (error) {
    console.error("Failed to generate response suggestion:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
