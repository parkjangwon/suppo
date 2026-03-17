import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const csat = await prisma.customerSatisfaction.findUnique({
      where: { ticketId: params.id },
    });

    return NextResponse.json(csat);
  } catch (error) {
    console.error("Failed to fetch CSAT:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
