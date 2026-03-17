import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await prisma.savedFilter.findUnique({
      where: { id: params.id },
    });

    if (!filter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 본인이 생성한 필터만 삭제 가능
    if (filter.createdById !== session.user.agentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.savedFilter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete saved filter:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
