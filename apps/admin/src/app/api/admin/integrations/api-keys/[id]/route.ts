import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import {
  DEFAULT_PUBLIC_API_KEY_SCOPES,
  normalizePublicApiKeyScopes,
  PUBLIC_API_SCOPES,
} from "@/lib/public-api/auth";

const updateApiKeySchema = z.object({
  isActive: z.boolean().optional(),
  scopes: z.array(z.enum(PUBLIC_API_SCOPES)).min(1).default(DEFAULT_PUBLIC_API_KEY_SCOPES).optional(),
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
    const validated = updateApiKeySchema.parse(body);

    const apiKey = await prisma.publicApiKey.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...apiKey,
      scopes: normalizePublicApiKeyScopes(apiKey.scopes),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to update public api key:", error);
    return NextResponse.json({ error: "Failed to update public api key" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.publicApiKey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete public api key:", error);
    return NextResponse.json({ error: "Failed to delete public api key" }, { status: 500 });
  }
}
