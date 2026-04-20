import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { getBackofficeSession } from "@suppo/shared/auth/session";
import { prisma } from "@suppo/db";
import { createAuditLog } from "@/lib/audit/logger";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getBackofficeSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "상담원을 찾을 수 없습니다" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 10);

  await prisma.agent.update({
    where: { id },
    data: {
      passwordHash,
      isInitialPassword: true,
      passwordChangedAt: null,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    actorType: session.user.role as "ADMIN" | "AGENT",
    actorName: session.user.name || "Unknown",
    actorEmail: session.user.email || "Unknown",
    action: "UPDATE",
    resourceType: "agent",
    resourceId: agent.id,
    description: `상담원 비밀번호 초기화: ${agent.name} (${agent.email})`,
  });

  return NextResponse.json({ tempPassword });
}
