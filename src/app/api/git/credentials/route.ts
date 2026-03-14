import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { encryptToken } from "@/lib/crypto/encrypt";
import { parseProvider } from "@/lib/git/provider";

export async function GET() {
  const credentials = await prisma.gitProviderCredential.findMany({
    orderBy: { provider: "asc" },
    select: {
      provider: true,
      updatedAt: true,
      createdAt: true
    }
  });

  return NextResponse.json({ credentials });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: string;
      token?: string;
    };

    if (!body.provider || !body.token?.trim()) {
      return NextResponse.json(
        { error: "provider와 token은 필수입니다." },
        { status: 400 }
      );
    }

    const provider = parseProvider(body.provider);
    const encryptedToken = encryptToken(body.token.trim());

    const credential = await prisma.gitProviderCredential.upsert({
      where: { provider },
      update: { encryptedToken },
      create: {
        provider,
        encryptedToken
      },
      select: {
        provider: true,
        updatedAt: true,
        createdAt: true
      }
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Git 자격 증명 저장에 실패했습니다: ${message}` },
      { status: 400 }
    );
  }
}
