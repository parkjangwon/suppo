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

const chatWidgetProfileSchema = z.object({
  name: z.string().min(1),
  widgetKey: z.string().min(1),
  buttonLabel: z.string().min(1),
  buttonImageUrl: widgetImageUrlSchema.optional(),
  buttonImageFit: z.enum(["contain", "cover"]).default("contain"),
  buttonBorderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  buttonBorderWidth: z.number().int().min(0).max(12).default(0),
  buttonHoverEffect: z.enum(["none", "lift", "glow", "pulse"]).default("lift"),
  buttonBadgeText: z.string().max(12).optional(),
  buttonBadgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#ef4444"),
  buttonBadgePosition: z.enum(["top-right", "top-left", "bottom-right", "bottom-left"]).default("top-right"),
  showUnreadBadge: z.boolean().default(true),
  buttonSize: z.enum(["sm", "md", "lg"]).default("md"),
  buttonShape: z.enum(["pill", "rounded", "circle"]).default("pill"),
  buttonShadow: z.enum(["none", "soft", "strong"]).default("soft"),
  welcomeTitle: z.string().min(1),
  welcomeMessage: z.string().min(1),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position: z.enum(["bottom-right", "bottom-left"]).default("bottom-right"),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  agentResponseTargetMinutes: z.number().int().min(1).default(5),
  customerFollowupTargetMinutes: z.number().int().min(1).default(30),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.chatWidgetProfile.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = chatWidgetProfileSchema.parse(body);

    if (validated.isDefault) {
      await prisma.chatWidgetProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.chatWidgetProfile.create({
      data: validated,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to create chat widget profile:", error);
    return NextResponse.json({ error: "Failed to create chat widget profile" }, { status: 500 });
  }
}
