// src/app/api/git/issue-detail/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { decryptToken } from "@crinity/shared/crypto/encrypt";
import type { IssueFullDetail } from "@crinity/shared/git/provider";
import { GitHubProvider } from "@/lib/git/providers/github";
import { GitLabProvider } from "@/lib/git/providers/gitlab";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketId = request.nextUrl.searchParams.get("ticketId");
    const linkId = request.nextUrl.searchParams.get("linkId");

    if (!ticketId || !linkId) {
      return NextResponse.json(
        { error: "ticketId와 linkId는 필수입니다." },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const agentId = session.user.agentId;

    // 비관리자 권한 확인
    if (!isAdmin) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { assigneeId: true }
      });

      if (!ticket || ticket.assigneeId !== agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // link 조회 및 ticketId 소유권 확인
    const link = await prisma.gitLink.findUnique({
      where: { id: linkId },
      select: { ticketId: true, provider: true, repoFullName: true, issueNumber: true }
    });

    if (!link || link.ticketId !== ticketId) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // provider credential 조회
    const credential = await prisma.gitProviderCredential.findUnique({
      where: { provider: link.provider },
      select: { encryptedToken: true }
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Provider credential not configured" },
        { status: 500 }
      );
    }

    const token = decryptToken(credential.encryptedToken);

    // provider 인스턴스 생성
    type FullDetailProvider = {
      getIssueFullDetail?: (
        repo: string,
        num: number,
        signal?: AbortSignal
      ) => Promise<IssueFullDetail>;
    };

    let provider: FullDetailProvider | null = null;
    if (link.provider === "GITHUB") provider = new GitHubProvider(token);
    else if (link.provider === "GITLAB") provider = new GitLabProvider(token);

    if (!provider?.getIssueFullDetail) {
      return NextResponse.json(
        { error: "이 provider는 상세 정보를 지원하지 않습니다." },
        { status: 404 }
      );
    }

    // 5초 타임아웃
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const detail = await provider.getIssueFullDetail(
        link.repoFullName,
        link.issueNumber,
        controller.signal
      );
      return NextResponse.json({ detail });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("GET /api/git/issue-detail error:", error);
    return NextResponse.json(
      { error: "이슈 상세 정보를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
