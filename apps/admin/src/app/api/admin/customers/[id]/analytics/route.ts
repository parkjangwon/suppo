import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCustomerInsights } from "@/lib/db/queries/admin-analytics/customer-insights";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await getCustomerInsights(id);

    if (!data) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Customer analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer analytics" },
      { status: 500 }
    );
  }
}
