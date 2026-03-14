import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { encryptToken } from "@/lib/crypto/encrypt";
import { parseProvider } from "@/lib/git/provider";

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: ADMIN role required" },
      { status: 403 }
    );
  }

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
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }
    
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
    console.error("Git credentials error:", error);
    
    return NextResponse.json(
      { error: "Git 자격 증명 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextResponse) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }
    
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "provider는 필수입니다." },
        { status: 400 }
      );
    }

    await prisma.gitProviderCredential.delete({
      where: { provider: parseProvider(provider) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Git credentials delete error:", error);
    
    return NextResponse.json(
      { error: "Git 자격 증명 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
