import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { encryptToken } from "@/lib/crypto/encrypt";
import { parseProvider } from "@/lib/git/provider";
import { validateRequest, gitCredentialsSchema } from "@/lib/security/input-validation";
import { requireJson } from "@/lib/security/content-type";
import { checkRateLimit, createRateLimitHeaders } from "@/lib/security/rate-limit";

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

export async function POST(request: NextRequest) {
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

    // 콘텐츠 타입 검증
    const contentTypeError = requireJson(request);
    if (contentTypeError) {
      return contentTypeError;
    }

    // Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitResult = checkRateLimit(ip, 10, 60 * 1000); // 10 requests per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const validated = validateRequest(gitCredentialsSchema, body);

    // 추가 토큰 검증: 너무 짧거나 너무 긴 토큰 거부
    if (validated.token.length < 10 || validated.token.length > 1000) {
      return NextResponse.json(
        { error: "토큰 길이가 유효하지 않습니다." },
        { status: 400 }
      );
    }

    const provider = parseProvider(validated.provider);
    const encryptedToken = encryptToken(validated.token.trim());

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

    return NextResponse.json({ credential }, { status: 201, headers: createRateLimitHeaders(rateLimitResult) });
  } catch (error) {
    console.error("Git credentials error:", error);

    return NextResponse.json(
      { error: "Git 자격 증명 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Provider 값 검증
    try {
      parseProvider(provider);
    } catch {
      return NextResponse.json(
        { error: "유효하지 않은 provider 값입니다." },
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
