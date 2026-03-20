import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const updateSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요"),
});

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
    
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        ticket: {
          select: {
            assigneeId: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.authorType !== "AGENT") {
      return NextResponse.json(
        { error: "Only agent comments can be edited" },
        { status: 403 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = comment.authorId === session.user.agentId;
    const isAssigned = comment.ticket.assigneeId === session.user.agentId;

    if (!isAdmin && !isAuthor && !isAssigned) {
      return NextResponse.json(
        { error: "You can only edit your own comments or comments on tickets assigned to you" },
        { status: 403 }
      );
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        content: parsed.data.content,
      },
      include: {
        attachments: true,
      },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
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

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        ticket: {
          select: {
            assigneeId: true,
          },
        },
        attachments: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.authorType !== "AGENT") {
      return NextResponse.json(
        { error: "Only agent comments can be deleted" },
        { status: 403 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = comment.authorId === session.user.agentId;
    const isAssigned = comment.ticket.assigneeId === session.user.agentId;

    if (!isAdmin && !isAuthor && !isAssigned) {
      return NextResponse.json(
        { error: "You can only delete your own comments or comments on tickets assigned to you" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
