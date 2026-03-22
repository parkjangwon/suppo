import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateTicketSummary } from "@/lib/ai/summarizer";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await updateTicketSummary(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update ticket summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
