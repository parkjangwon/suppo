import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/crypto/encrypt";
import { parseProvider, resolveLimit, validateRepoFullName } from "@/lib/git/provider";
import { GitHubProvider } from "@/lib/git/providers/github";
import { GitLabProvider } from "@/lib/git/providers/gitlab";
import { CodeCommitProvider } from "@/lib/git/providers/codecommit";

function createProviderClient(provider: "GITHUB" | "GITLAB" | "CODECOMMIT", token: string) {
  switch (provider) {
    case "GITHUB":
      return new GitHubProvider(token);
    case "GITLAB":
      return new GitLabProvider(token);
    case "CODECOMMIT":
      return new CodeCommitProvider();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function GET(request: NextRequest) {
  try {
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
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `이슈 검색에 실패했습니다: ${message}` },
      { status: 400 }
    );
  }
}
