import { NextResponse } from "next/server";

import { createChatConversation } from "@crinity/shared/chat/service";
import { verifyCaptcha } from "@crinity/shared/security/captcha";
import { createChatConversationSchema } from "@crinity/shared/validation/chat";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createChatConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    if (!(await verifyCaptcha(parsed.data.captchaToken))) {
      return NextResponse.json(
        { error: "CAPTCHA 검증에 실패했습니다. 다시 시도해주세요." },
        { status: 400 }
      );
    }

    const result = await createChatConversation({
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      initialMessage: parsed.data.initialMessage,
      widgetKey: parsed.data.widgetKey,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    console.error("Failed to create chat conversation:", error);
    return NextResponse.json({ error: "Failed to create chat conversation" }, { status: 500 });
  }
}
