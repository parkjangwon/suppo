import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  acquireCommentLock,
  releaseCommentLock,
  getCommentLock,
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

    const lock = await acquireCommentLock(ticketId, agentId);

    if (!lock) {
      const existingLock = await getCommentLock(ticketId);
      return NextResponse.json(
        {
          error: "Lock already acquired by another agent",
          lockedBy: existingLock?.agentName || "Another agent",
          expiresAt: existingLock?.expiresAt,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      lock: {
        agentId: lock.agentId,
        agentName: lock.agentName,
        acquiredAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
      },
    });
  } catch (error) {
    console.error("Failed to acquire comment lock:", error);
    return NextResponse.json(
      { error: "Failed to acquire lock" },
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

    const lock = await getCommentLock(ticketId);

    if (!lock) {
      return NextResponse.json({
        locked: false,
      });
    }

    return NextResponse.json({
      locked: true,
      lock: {
        agentId: lock.agentId,
        agentName: lock.agentName,
        acquiredAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
      },
    });
  } catch (error) {
    console.error("Failed to get comment lock:", error);
    return NextResponse.json(
      { error: "Failed to get lock status" },
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

    const released = await releaseCommentLock(ticketId, agentId);

    if (!released) {
      return NextResponse.json(
        { error: "No active lock found for this agent" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to release comment lock:", error);
    return NextResponse.json(
      { error: "Failed to release lock" },
      { status: 500 }
    );
  }
}
