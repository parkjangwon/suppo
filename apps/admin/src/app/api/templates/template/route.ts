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
    const {
      title,
      content,
      variables,
      categoryId,
      requestTypeId,
      isShared,
      isRecommended,
      sortOrder,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다." },
        { status: 400 }
      );
    }

    const template = await prisma.responseTemplate.create({
      data: {
        title,
        content,
        variables: variables || [],
        categoryId: categoryId || null,
        requestTypeId: requestTypeId || null,
        createdById: session.user.id,
        isShared: isShared ?? true,
        isRecommended: isRecommended ?? false,
        sortOrder: sortOrder || 0,
      },
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      action: "CREATE",
      resourceType: "response_template",
      resourceId: template.id,
      description: `응답 템플릿 생성: ${title}`,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template POST error:", error);
    return NextResponse.json(
      { error: "템플릿을 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      title,
      content,
      variables,
      categoryId,
      requestTypeId,
      isShared,
      isRecommended,
      sortOrder,
    } = body;

    if (!id || !title || !content) {
      return NextResponse.json(
        { error: "ID, 제목, 내용은 필수입니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.responseTemplate.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = existing.createdById === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const template = await prisma.responseTemplate.update({
      where: { id },
      data: {
        title,
        content,
        variables: variables || [],
        categoryId: categoryId || null,
        requestTypeId: requestTypeId || null,
        isShared: isShared ?? true,
        isRecommended: isRecommended ?? false,
        sortOrder: sortOrder || 0,
      },
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      action: "UPDATE",
      resourceType: "response_template",
      resourceId: template.id,
      description: `응답 템플릿 수정: ${title}`,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json(
      { error: "템플릿을 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID는 필수입니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.responseTemplate.findUnique({
      where: { id },
      select: { createdById: true, title: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = existing.createdById === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    await prisma.responseTemplate.delete({
      where: { id },
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "",
      action: "DELETE",
      resourceType: "response_template",
      resourceId: id,
      description: `응답 템플릿 삭제: ${existing.title}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json(
      { error: "템플릿을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
