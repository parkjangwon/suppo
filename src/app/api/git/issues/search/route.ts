import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/crypto/encrypt";
import { parseProvider, resolveLimit, validateRepoFullName } from "@/lib/git/provider";
import { GitHubProvider } from "@/lib/git/providers/github";
import { GitLabProvider } from "@/lib/git/providers/gitlab";

function createProviderClient(provider: "GITHUB" | "GITLAB", token: string) {
  switch (provider) {
    case "GITHUB":
      return new GitHubProvider(token);
    case "GITLAB":
      return new GitLabProvider(token);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const providerParam = request.nextUrl.searchParams.get("provider");
    const repoParam = request.nextUrl.searchParams.get("repo");
    const query = request.nextUrl.searchParams.get("q") ?? undefined;
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "20");

    if (!providerParam || !repoParam) {
      return NextResponse.json(
        { error: "provider와 repo는 필수 쿼리입니다." },
        { status: 400 }
      );
    }

    const provider = parseProvider(providerParam);
    const repoFullName = validateRepoFullName(repoParam);
    const limit = resolveLimit(limitParam);

    const credential = await prisma.gitProviderCredential.findUnique({
      where: { provider },
      select: {
        encryptedToken: true
      }
    });

    if (!credential) {
      return NextResponse.json(
        { error: `${provider} 자격 증명이 등록되지 않았습니다.` },
        { status: 404 }
      );
    }

    const token = decryptToken(credential.encryptedToken);
    const providerClient = createProviderClient(provider, token);
    const issues = await providerClient.searchIssues({
      repoFullName,
      query,
      limit
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("Git search error:", error);

    return NextResponse.json(
      { error: "이슈 검색에 실패했습니다." },
      { status: 500 }
    );
  }
}
