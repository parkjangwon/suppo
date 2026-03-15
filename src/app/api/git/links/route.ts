import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { parseProvider, validateRepoFullName } from "@/lib/git/provider";
import { createAuditLog } from "@/lib/audit/logger";

function validateIssueUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      "github.com",
      "gitlab.com",
      "*.github.com",
      "*.gitlab.com"
    ];
    
    const isAllowed = allowedHosts.some(host => {
      if (host.startsWith("*.")) {
        const domain = host.slice(2);
        return parsed.hostname === domain || parsed.hostname.endsWith("." + domain);
      }
      return parsed.hostname === host;
    });
    
    return isAllowed && (parsed.protocol === "https:" || parsed.protocol === "http:");
  } catch {
    return false;
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

    const ticketId = request.nextUrl.searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId는 필수입니다." }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const links = await prisma.gitLink.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error("Git links GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve git links" },
      { status: 500 }
    );
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
      ticketId?: string;
      provider?: string;
      repoFullName?: string;
      issueNumber?: number;
      issueUrl?: string;
    };

    if (
      !body.ticketId ||
      !body.provider ||
      !body.repoFullName ||
      !body.issueNumber ||
      !body.issueUrl?.trim()
    ) {
      return NextResponse.json(
        { error: "ticketId, provider, repoFullName, issueNumber, issueUrl이 필요합니다." },
        { status: 400 }
      );
    }

    if (!validateIssueUrl(body.issueUrl.trim())) {
      return NextResponse.json(
        { error: "Invalid issueUrl. Only GitHub and GitLab URLs are allowed." },
        { status: 400 }
      );
    }

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

    const provider = parseProvider(body.provider);
    const repoFullName = validateRepoFullName(body.repoFullName);

    const link = await prisma.gitLink.create({
      data: {
        ticketId: body.ticketId,
        provider,
        repoFullName,
        issueNumber: Number(body.issueNumber),
        issueUrl: body.issueUrl.trim()
      }
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "CREATE",
      resourceType: "git_link",
      resourceId: link.id,
      description: `Git 이슈 연결: ${provider} ${repoFullName}#${body.issueNumber}`,
      newValue: {
        provider,
        repoFullName,
        issueNumber: body.issueNumber,
        issueUrl: body.issueUrl.trim()
      },
      metadata: {
        ticketId: body.ticketId
      }
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error("Git links POST error:", error);
    
    if (
      error instanceof Error &&
      (error.message.includes("Unique constraint") || error.message.includes("P2002"))
    ) {
      return NextResponse.json({ error: "이미 연결된 이슈입니다." }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Git 이슈 연결에 실패했습니다." },
      { status: 500 }
    );
  }
}
