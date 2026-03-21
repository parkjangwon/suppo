import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  resetCategories,
  validateResetCategories,
  type ResetCategory,
} from "@/lib/system/reset";
import { prisma } from "@/lib/db/client";

const VALID_CATEGORIES = new Set([
  "tickets",
  "agents",
  "settings",
  "knowledge",
  "audit_logs",
]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const categories: ResetCategory[] = (body.categories ?? []).filter(
      (c: string) => VALID_CATEGORIES.has(c)
    );

    if (categories.length === 0) {
      return NextResponse.json(
        { error: "초기화할 항목을 하나 이상 선택하세요" },
        { status: 400 }
      );
    }

    const validationError = validateResetCategories(categories);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await resetCategories(categories);

    // audit log는 초기화 후 새로 기록
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id!,
        actorEmail: session.user.email!,
        actorName: session.user.name ?? "",
        actorType: "AGENT",
        action: "SETTINGS_CHANGE",
        resourceType: "SYSTEM",
        description: `시스템 초기화: ${categories.join(", ")}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset failed:", error);
    const message =
      error instanceof Error ? error.message : "초기화 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
