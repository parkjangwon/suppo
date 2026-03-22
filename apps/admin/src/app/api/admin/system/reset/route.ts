import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  resetCategories,
  validateResetCategories,
  type ResetCategory,
} from "@/lib/system/reset";
import { createAuditLog } from "@/lib/audit/logger";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set<ResetCategory>([
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
    const rawCategories: string[] = body.categories ?? [];

    const unknownCategories = rawCategories.filter(
      (c) => !VALID_CATEGORIES.has(c as ResetCategory)
    );
    if (unknownCategories.length > 0) {
      return NextResponse.json(
        { error: `알 수 없는 초기화 항목: ${unknownCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const categories = rawCategories as ResetCategory[];

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

    await createAuditLog({
      actorId: session.user.id!,
      actorEmail: session.user.email!,
      actorName: session.user.name ?? "",
      actorType: session.user.role as "ADMIN" | "AGENT",
      action: "SETTINGS_CHANGE",
      resourceType: "SYSTEM",
      description: `시스템 초기화: ${categories.join(", ")}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset failed:", error);
    const message =
      error instanceof Error ? error.message : "초기화 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
