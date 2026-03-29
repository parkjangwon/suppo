import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { createPublicApiKey } from "@/lib/public-api/auth";

const createApiKeySchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKeys = await prisma.publicApiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(apiKeys);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createApiKeySchema.parse(body);
    const { apiKey, plaintextKey } = await createPublicApiKey(validated.name, session.user.agentId);

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        plaintextKey,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    console.error("Failed to create public api key:", error);
    return NextResponse.json({ error: "Failed to create public api key" }, { status: 500 });
  }
}
