import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@crinity/db";
import { GitEventType, GitProvider } from "@prisma/client";

/**
 * GitHub 웹훅 핸들러
 * - push, pull_request, issues 이벤트 처리
 */
export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");
    const contentType = request.headers.get("content-type");

    // 콘텐츠 타입 검증
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // 본문을 문자열로 읽어서 시그니처 검증
    const bodyText = await request.text();

    // 시그니처 검증
    if (!(await verifyGitHubSignature(bodyText, signature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // JSON 파싱
    const body = JSON.parse(bodyText);

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
 * GitHub 시그니처 검증 - HMAC-SHA256
 */
async function verifyGitHubSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET not set - webhook verification disabled");
    // 보안을 위해 개발 환경에서도 검증 실패 처리
    return false;
  }

  if (!signature) {
    console.error("Missing x-hub-signature-256 header");
    return false;
  }

  // 시그니처 형식 검증: sha256=hex
  const shaPrefix = "sha256=";
  if (!signature.startsWith(shaPrefix)) {
    console.error("Invalid signature format");
    return false;
  }

  const signatureHash = signature.slice(shaPrefix.length);

  try {
    // Web Crypto API를 사용한 HMAC-SHA256 검증
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignatureHex = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const isValid = expectedSignatureHex === signatureHash;

    if (!isValid) {
      console.error("GitHub webhook signature verification failed");
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying GitHub signature:", error);
    return false;
  }
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
