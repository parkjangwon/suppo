import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/crypto/encrypt";
import { parseProvider, validateRepoFullName } from "@/lib/git/provider";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: string;
      repoFullName?: string;
      title?: string;
      description?: string;
      ticketId?: string;
    };

    if (!body.provider || !body.repoFullName) {
      return NextResponse.json(
        { error: "provider와 repoFullName은 필수입니다." },
        { status: 400 }
      );
    }

    const provider = parseProvider(body.provider);
    const repoFullName = validateRepoFullName(body.repoFullName);

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

    let ticketContext: {
      ticketNumber: string;
      subject: string;
      description: string;
    } | null = null;

    if (body.ticketId) {
      ticketContext = await prisma.ticket.findUnique({
        where: { id: body.ticketId },
        select: {
          ticketNumber: true,
          subject: true,
          description: true
        }
      });
    }

    const title =
      body.title?.trim() ||
      (ticketContext
        ? `[${ticketContext.ticketNumber}] ${ticketContext.subject}`
        : undefined);

    if (!title) {
      return NextResponse.json(
        { error: "title 또는 ticketId가 필요합니다." },
        { status: 400 }
      );
    }

    const description =
      body.description?.trim() ||
      (ticketContext
        ? [
            `원본 티켓: ${ticketContext.ticketNumber}`,
            "",
            ticketContext.description
          ].join("\n")
        : undefined);

    const token = decryptToken(credential.encryptedToken);
    const providerClient = createProviderClient(provider, token);
    const issue = await providerClient.createIssue({
      repoFullName,
      title,
      body: description
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `이슈 생성에 실패했습니다: ${message}` },
      { status: 400 }
    );
  }
}
