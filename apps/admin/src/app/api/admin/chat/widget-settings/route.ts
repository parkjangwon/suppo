import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { ensureChatWidgetSettings } from "@crinity/shared/chat/widget-settings";

const widgetImageUrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith("/uploads/") || z.string().url().safeParse(value).success,
    "유효한 이미지 URL을 입력해주세요.",
  );

const updateChatWidgetSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  buttonLabel: z.string().min(1).optional(),
  buttonImageUrl: widgetImageUrlSchema.nullable().optional(),
  buttonImageFit: z.enum(["contain", "cover"]).optional(),
  buttonBorderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  buttonBorderWidth: z.number().int().min(0).max(12).optional(),
  buttonHoverEffect: z.enum(["none", "lift", "glow", "pulse"]).optional(),
  buttonBadgeText: z.string().max(12).nullable().optional(),
  buttonBadgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  buttonBadgePosition: z.enum(["top-right", "top-left", "bottom-right", "bottom-left"]).optional(),
  showUnreadBadge: z.boolean().optional(),
  buttonSize: z.enum(["sm", "md", "lg"]).optional(),
  buttonShape: z.enum(["pill", "rounded", "circle"]).optional(),
  buttonShadow: z.enum(["none", "soft", "strong"]).optional(),
  welcomeTitle: z.string().min(1).optional(),
  welcomeMessage: z.string().min(1).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  agentResponseTargetMinutes: z.number().int().min(1).optional(),
  customerFollowupTargetMinutes: z.number().int().min(1).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await ensureChatWidgetSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = updateChatWidgetSettingsSchema.parse(body);

    const settings = await prisma.chatWidgetSettings.upsert({
      where: { id: "default" },
      update: validated,
      create: {
        id: "default",
        widgetKey: "crinity-chat-widget",
        ...validated,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to update chat widget settings:", error);
    return NextResponse.json({ error: "Failed to update chat widget settings" }, { status: 500 });
  }
}
