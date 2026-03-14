import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { GitEventType, GitProvider } from "@prisma/client";

/**
 * GitHub 웹훅 핸들러
 * - push, pull_request, issues 이벤트 처리
 */
export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");
    const body = await request.json();

    // 시그니처 검증
    if (!verifyGitHubSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    switch (event) {
      case "push":
        await handlePushEvent(body);
        break;
      case "pull_request":
        await handlePullRequestEvent(body);
        break;
      case "issues":
        await handleIssuesEvent(body);
        break;
      default:
        return NextResponse.json({ message: "Event ignored" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GitHub 시그니처 검증
 */
function verifyGitHubSignature(
  body: unknown,
  signature: string | null
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("GITHUB_WEBHOOK_SECRET not set");
    return true; // 개발 환경에서는 무시
  }

  if (!signature) return false;

  // TODO: crypto 모듈로 HMAC 검증 구현
  // const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
  // return signature === `sha256=${expected}`;
  return true;
}

/**
 * Push 이벤트 처리
 * - 커밋 메시지에서 티켓 번호 추출하여 연결
 */
async function handlePushEvent(body: {
  repository: { full_name: string };
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>;
}): Promise<void> {
  const repoFullName = body.repository.full_name;
  const ref = body.ref;

  for (const commit of body.commits) {
    const ticketNumbers = extractTicketNumbers(commit.message);

    for (const ticketNumber of ticketNumbers) {
      const ticket = await prisma.ticket.findUnique({
        where: { ticketNumber },
      });

      if (ticket) {
        // Git 이벤트 기록
        await prisma.gitEvent.create({
          data: {
            ticketId: ticket.id,
            provider: GitProvider.GITHUB,
            eventType: GitEventType.COMMIT_PUSHED,
            repoFullName,
            ref,
            commitSha: commit.id,
            commitMessage: commit.message,
            authorName: commit.author.name,
            authorEmail: commit.author.email,
            occurredAt: new Date(commit.timestamp),
          },
        });

        // 기존 GitLink가 없으면 생성
        const existingLink = await prisma.gitLink.findFirst({
          where: {
            ticketId: ticket.id,
            provider: GitProvider.GITHUB,
            repoFullName,
          },
        });

        if (!existingLink) {
          await prisma.gitLink.create({
            data: {
              ticketId: ticket.id,
              provider: GitProvider.GITHUB,
              repoFullName,
              issueNumber: 0,
              issueUrl: `https://github.com/${repoFullName}/commit/${commit.id}`,
            },
          });
        }
      }
    }
  }
}

/**
 * Pull Request 이벤트 처리
 */
async function handlePullRequestEvent(body: {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
    created_at: string;
    merged: boolean;
  };
  repository: { full_name: string };
}): Promise<void> {
  const pr = body.pull_request;
  const repoFullName = body.repository.full_name;
  const ticketNumbers = extractTicketNumbers(pr.title);

  let eventType: GitEventType;
  switch (body.action) {
    case "opened":
      eventType = GitEventType.PR_OPENED;
      break;
    case "closed":
      eventType = pr.merged ? GitEventType.PR_MERGED : GitEventType.PR_CLOSED;
      break;
    default:
      return;
  }

  for (const ticketNumber of ticketNumbers) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (ticket) {
      await prisma.gitEvent.create({
        data: {
          ticketId: ticket.id,
          provider: GitProvider.GITHUB,
          eventType,
          repoFullName,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.html_url,
          authorName: pr.user.login,
          occurredAt: new Date(pr.created_at),
        },
      });

      // GitLink 생성/업데이트
      await prisma.gitLink.upsert({
        where: {
          provider_repoFullName_issueNumber: {
            provider: GitProvider.GITHUB,
            repoFullName,
            issueNumber: pr.number,
          },
        },
        update: {
          ticketId: ticket.id,
        },
        create: {
          ticketId: ticket.id,
          provider: GitProvider.GITHUB,
          repoFullName,
          issueNumber: pr.number,
          issueUrl: pr.html_url,
        },
      });
    }
  }
}

/**
 * Issues 이벤트 처리
 */
async function handleIssuesEvent(body: {
  action: string;
  issue: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
    created_at: string;
  };
  repository: { full_name: string };
}): Promise<void> {
  if (body.action !== "opened") return;

  const issue = body.issue;
  const repoFullName = body.repository.full_name;
  const ticketNumbers = extractTicketNumbers(issue.title);

  for (const ticketNumber of ticketNumbers) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (ticket) {
      await prisma.gitEvent.create({
        data: {
          ticketId: ticket.id,
          provider: GitProvider.GITHUB,
          eventType: GitEventType.ISSUE_LINKED,
          repoFullName,
          prNumber: issue.number,
          prTitle: issue.title,
          prUrl: issue.html_url,
          authorName: issue.user.login,
          occurredAt: new Date(issue.created_at),
        },
      });
    }
  }
}

/**
 * 커밋 메시지/PR 제목에서 티켓 번호 추출
 * - TKT-123, #123, ticket:123 등 다양한 형식 지원
 */
function extractTicketNumbers(text: string): string[] {
  const patterns = [
    /TKT-\d{4}-\d+/g, // TKT-2024-000123
    /TKT-\d+/g, // TKT-123
    /#(\d{4}-\d+)/g, // #2024-000123
    /#(\d+)/g, // #123
    /ticket[:\s]+(\d+)/gi, // ticket:123, ticket 123
  ];

  const ticketNumbers = new Set<string>();

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let ticketNumber = match[0];
      
      // #123 형식을 TKT-123으로 변환
      if (ticketNumber.startsWith("#")) {
        const num = ticketNumber.slice(1);
        if (num.includes("-")) {
          ticketNumber = `TKT-${num}`;
        } else {
          const year = new Date().getFullYear();
          ticketNumber = `TKT-${year}-${num.padStart(6, "0")}`;
        }
      }

      ticketNumbers.add(ticketNumber);
    }
  }

  return Array.from(ticketNumbers);
}
