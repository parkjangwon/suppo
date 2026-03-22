import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { z } from "zod";

const slaPolicySchema = z.object({
  name: z.string().min(1, "정책 이름을 입력하세요"),
  description: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]),
  firstResponseHours: z.number().min(0.1, "최소 0.1시간 이상"),
  resolutionHours: z.number().min(0.1, "최소 0.1시간 이상"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const policies = await prisma.sLAPolicy.findMany({
      include: {
        _count: {
          select: { clocks: true },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { priority: "asc" },
      ],
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Failed to fetch SLA policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch SLA policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = slaPolicySchema.parse(body);

    // 동일 우선순위의 기존 정책 비활성화
    await prisma.sLAPolicy.updateMany({
      where: {
        priority: validated.priority,
        isActive: true,
      },
      data: { isActive: false },
    });

    const policy = await prisma.sLAPolicy.create({
      data: validated,
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create SLA policy:", error);
    return NextResponse.json(
      { error: "Failed to create SLA policy" },
      { status: 500 }
    );
  }
}
