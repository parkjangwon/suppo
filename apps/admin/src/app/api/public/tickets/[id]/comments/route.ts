import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@suppo/db";

import {
  authenticatePublicApiKey,
  hasPublicApiScope,
} from "@/lib/public-api/auth";

const addCommentSchema = z.object({
  body: z.string().min(1),
  internal: z.boolean().default(false),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const apiKey = await authenticatePublicApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPublicApiScope(apiKey, "tickets:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const rawBody = await request.json();
    const validated = addCommentSchema.parse(rawBody);

    const comment = await prisma.comment.create({
      data: {
        ticketId: id,
        authorType: "SYSTEM",
        authorId: null,
        authorName: "API",
        authorEmail: "api@system",
        content: validated.body,
        isInternal: validated.internal,
      },
    });

    return NextResponse.json(
      {
        id: comment.id,
        ticketId: comment.ticketId,
        body: comment.content,
        internal: comment.isInternal,
        authorId: comment.authorId,
        createdAt: comment.createdAt,
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

    console.error("Failed to add comment from public api:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
