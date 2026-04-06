import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateTicketSummary } from "@/lib/ai/summarizer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await updateTicketSummary(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update ticket summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
