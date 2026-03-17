import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.automationRule.findMany({
      where: { createdById: session.user.id },
      orderBy: [
        { isActive: "desc" },
        { priority: "desc" },
      ],
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Get automation rules error:", error);
    return NextResponse.json(
      { error: "자동화 규칙을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, conditions, actions, triggerOn, priority = 0 } = body;

    if (!name || !conditions || !actions || !triggerOn) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        description,
        conditions,
        actions,
        triggerOn,
        priority,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Create automation rule error:", error);
    return NextResponse.json(
      { error: "자동화 규칙 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
