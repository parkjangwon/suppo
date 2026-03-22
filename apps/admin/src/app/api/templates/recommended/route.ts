import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const requestTypeId = request.nextUrl.searchParams.get("requestTypeId");

    if (!requestTypeId) {
      return NextResponse.json(
        { error: "requestTypeId는 필수입니다." },
        { status: 400 }
      );
    }

    const recommendedTemplates = await prisma.responseTemplate.findMany({
      where: {
        requestTypeId,
        isRecommended: true,
        OR: [
          { isShared: true },
          { createdById: session.user.id }
        ]
      },
      orderBy: [
        { sortOrder: "asc" },
        { title: "asc" }
      ]
    });

    const generalTemplates = await prisma.responseTemplate.findMany({
      where: {
        requestTypeId: null,
        isShared: true,
        isRecommended: true
      },
      orderBy: [
        { sortOrder: "asc" },
        { title: "asc" }
      ],
      take: 5
    });

    const recentlyUsed = await prisma.auditLog.findMany({
      where: {
        actorId: session.user.id,
        resourceType: "response_template",
        action: "USE"
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        resourceId: true
      }
    });

    const recentlyUsedIds = recentlyUsed
      .map(log => log.resourceId)
      .filter((id): id is string => id !== null);

    const recentTemplates = recentlyUsedIds.length > 0
      ? await prisma.responseTemplate.findMany({
          where: {
            id: { in: recentlyUsedIds },
            OR: [
              { isShared: true },
              { createdById: session.user.id }
            ]
          }
        })
      : [];

    const orderedRecentTemplates = recentlyUsedIds
      .map(id => recentTemplates.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    return NextResponse.json({
      recommended: recommendedTemplates,
      general: generalTemplates,
      recent: orderedRecentTemplates
    });
  } catch (error) {
    console.error("Recommended templates GET error:", error);
    return NextResponse.json(
      { error: "추천 템플릿을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
