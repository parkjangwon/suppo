import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { z } from "zod";

const createLinkSchema = z.object({
  articleId: z.string().min(1),
  linkType: z.enum(["AI_SUGGESTION", "AGENT_INSERT", "MANUAL_LINK"]).default("MANUAL_LINK"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await params;

  const links = await prisma.ticketKnowledgeLink.findMany({
    where: { ticketId },
    include: {
      article: {
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
        },
      },
      agent: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ links });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const agentId = (session.user as { id?: string }).id;
  if (!agentId) {
    return NextResponse.json({ error: "Agent ID not found" }, { status: 400 });
  }

  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: parsed.data.articleId },
    select: { id: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const link = await prisma.ticketKnowledgeLink.upsert({
    where: {
      ticketId_articleId: {
        ticketId,
        articleId: parsed.data.articleId,
      },
    },
    create: {
      ticketId,
      articleId: parsed.data.articleId,
      agentId,
      linkType: parsed.data.linkType,
    },
    update: {},
    include: {
      article: {
        select: { id: true, title: true, slug: true, excerpt: true },
      },
      agent: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await params;
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");

  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  await prisma.ticketKnowledgeLink.deleteMany({
    where: { ticketId, articleId },
  });

  return NextResponse.json({ success: true });
}
