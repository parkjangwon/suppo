import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { createAuditLog } from "@/lib/audit/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId는 필수입니다." },
        { status: 400 }
      );
    }

    const template = await prisma.responseTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        title: true,
        isShared: true,
        createdById: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const hasAccess = template.isShared || template.createdById === session.user.id;
    if (!hasAccess) {
      return NextResponse.json(
        { error: "이 템플릿을 사용할 권한이 없습니다." },
        { status: 403 }
      );
    }

    await createAuditLog({
      actorId: session.user.id,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      action: "USE",
      resourceType: "response_template",
      resourceId: template.id,
      description: `템플릿 사용: ${template.title}`,
      metadata: {
        templateTitle: template.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template use POST error:", error);
    return NextResponse.json(
      { error: "템플릿 사용 기록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
