import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  heartbeatPresence,
  getActiveViewers,
  removePresence,
} from "@/lib/tickets/collaboration";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const agentId = session.user.id;

    await heartbeatPresence(ticketId, agentId);

    const viewers = await getActiveViewers(ticketId, agentId);

    return NextResponse.json({
      success: true,
      viewers,
    });
  } catch (error) {
    console.error("Failed to update presence:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const agentId = session.user.id;

    const viewers = await getActiveViewers(ticketId, agentId);

    return NextResponse.json({
      viewers,
    });
  } catch (error) {
    console.error("Failed to get viewers:", error);
    return NextResponse.json(
      { error: "Failed to get viewers" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const agentId = session.user.id;

    await removePresence(ticketId, agentId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to remove presence:", error);
    return NextResponse.json(
      { error: "Failed to remove presence" },
      { status: 500 }
    );
  }
}
