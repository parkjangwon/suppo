import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { analyzeCustomer } from "@/lib/llm/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        tickets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (customer.tickets.length === 0) {
      return NextResponse.json(
        { error: "티켓 이력이 없어 분석할 수 없습니다" },
        { status: 400 }
      );
    }

    const analysis = await analyzeCustomer(id, customer.tickets);

    if (!analysis) {
      return NextResponse.json(
        { error: "AI 분석이 비활성화되어 있거나 설정이 완료되지 않았습니다" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "고객 분석이 완료되었습니다",
      customerId: id,
      analysis,
    });
  } catch (error) {
    console.error("Failed to trigger customer analysis:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger customer analysis" },
      { status: 500 },
    );
  }
}
