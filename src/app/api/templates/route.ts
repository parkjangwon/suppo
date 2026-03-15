import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const templates = await prisma.responseTemplate.findMany({
      where: {
        OR: [
          { isShared: true },
          { createdById: session.user.id }
        ]
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        requestType: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { isShared: "desc" },
        { sortOrder: "asc" },
        { title: "asc" }
      ]
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json(
      { error: "템플릿 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
