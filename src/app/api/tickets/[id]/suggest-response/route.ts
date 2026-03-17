import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateResponseSuggestion } from "@/lib/ai/suggestion-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
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

    const suggestion = await generateResponseSuggestion({
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category?.name,
      requestType: ticket.requestType?.name,
      priority: ticket.priority,
      comments: ticket.comments.map(c => ({
        content: c.content,
        authorType: c.authorType,
        createdAt: c.createdAt,
      })),
    });

    if (!suggestion) {
      return NextResponse.json({ error: "AI not available" }, { status: 503 });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Failed to generate response suggestion:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
