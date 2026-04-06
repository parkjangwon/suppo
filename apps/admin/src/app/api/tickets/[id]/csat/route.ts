import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const csat = await prisma.customerSatisfaction.findUnique({
      where: { ticketId: id },
    });

    return NextResponse.json(csat);
  } catch (error) {
    console.error("Failed to fetch CSAT:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
