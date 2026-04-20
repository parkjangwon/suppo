import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { enqueueEmail } from "@suppo/shared/email/enqueue";
import { processOutbox } from "@suppo/shared/email/process-outbox";
import {
  formatEmailFrom,
  getDefaultEmailSettings,
  validateEmailSettings,
} from "@suppo/shared/email/settings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const persistedSettings = await prisma.emailSettings.findUnique({
    where: { id: "default" },
  });
  const body = await request.json().catch(() => ({}));
  const mergedSettings = {
    ...getDefaultEmailSettings(),
    ...persistedSettings,
    ...body,
  };

  const validationErrors = validateEmailSettings(mergedSettings, {
    requireConfiguredProvider: true,
  });

  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors[0] }, { status: 400 });
  }

  const recipient = mergedSettings.notificationEmail || session.user.email || "";
  if (!recipient) {
    return NextResponse.json(
      { error: "테스트 메일을 받을 이메일 주소가 없습니다." },
      { status: 400 },
    );
  }

  const subject = "[Suppo] 이메일 연동 테스트 메일";
  const htmlBody = `<!doctype html>
<html lang="ko">
  <body style="font-family: Arial, sans-serif; padding: 24px;">
    <h1>이메일 연동 테스트</h1>
    <p>현재 설정으로 발송된 테스트 메일입니다.</p>
    <p>Provider: <strong>${mergedSettings.provider}</strong></p>
    <p>From: <strong>${formatEmailFrom(mergedSettings.fromEmail, mergedSettings.fromName)}</strong></p>
  </body>
</html>`;

  const delivery = await enqueueEmail({
    to: recipient,
    subject,
    body: htmlBody,
    category: "INTERNAL",
  });

  const result = await processOutbox({
    deliveryIds: [delivery.id],
    limit: 1,
    ignoreMasterToggles: true,
  });

  return NextResponse.json({
    success: result.sent === 1,
    recipient,
    result,
  });
}
