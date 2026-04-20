import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { decryptToken } from "@suppo/shared/crypto/encrypt";
import { parseProvider, validateRepoFullName } from "@suppo/shared/git/provider";
import { GitHubProvider } from "@/lib/git/providers/github";
import { GitLabProvider } from "@/lib/git/providers/gitlab";
import { createAuditLog } from "@/lib/audit/logger";

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

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    if (body.ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: body.ticketId },
        select: { assigneeId: true }
      });

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      const isAdmin = session.user.role === "ADMIN";
      const isAssignee = ticket.assigneeId === session.user.agentId;

      if (!isAdmin && !isAssignee) {
        return NextResponse.json(
          { error: "Forbidden: You can only link issues to your assigned tickets" },
          { status: 403 }
        );
      }
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

    await createAuditLog({
      actorId: session.user.id,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "CREATE",
      resourceType: "git_issue",
      resourceId: String(issue.number),
      description: `Git 이슈 생성: ${provider} ${repoFullName}#${issue.number}`,
      newValue: {
        provider,
        repoFullName,
        issueNumber: issue.number,
        issueUrl: issue.url,
        title
      },
      metadata: {
        ticketId: body.ticketId
      }
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    console.error("Git create issue error:", error);

    return NextResponse.json(
      { error: "이슈 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
