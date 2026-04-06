import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";

const widgetImageUrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith("/uploads/") || z.string().url().safeParse(value).success,
    "유효한 이미지 URL을 입력해주세요.",
  );

const updateChatWidgetProfileSchema = z.object({
  name: z.string().min(1).optional(),
  widgetKey: z.string().min(1).optional(),
  buttonLabel: z.string().min(1).optional(),
  buttonImageUrl: widgetImageUrlSchema.nullable().optional(),
  buttonImageFit: z.enum(["contain", "cover"]).optional(),
  buttonBorderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  buttonBorderWidth: z.number().int().min(0).max(12).optional(),
  buttonHoverEffect: z.enum(["none", "lift", "glow", "pulse"]).optional(),
  buttonBadgeText: z.string().max(12).nullable().optional(),
  buttonBadgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  buttonBadgePosition: z.enum(["top-right", "top-left", "bottom-right", "bottom-left"]).optional(),
  showUnreadBadge: z.boolean().optional(),
  buttonSize: z.enum(["sm", "md", "lg"]).optional(),
  buttonShape: z.enum(["pill", "rounded", "circle"]).optional(),
  buttonShadow: z.enum(["none", "soft", "strong"]).optional(),
  welcomeTitle: z.string().min(1).optional(),
  welcomeMessage: z.string().min(1).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  agentResponseTargetMinutes: z.number().int().min(1).optional(),
  customerFollowupTargetMinutes: z.number().int().min(1).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateChatWidgetProfileSchema.parse(body);

    if (validated.isDefault) {
      await prisma.chatWidgetProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updateData = {
      ...validated,
      buttonBadgeColor: validated.buttonBadgeColor ?? undefined,
    };

    const profile = await prisma.chatWidgetProfile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to update chat widget profile:", error);
    return NextResponse.json({ error: "Failed to update chat widget profile" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.chatWidgetProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat widget profile:", error);
    return NextResponse.json({ error: "Failed to delete chat widget profile" }, { status: 500 });
  }
}
