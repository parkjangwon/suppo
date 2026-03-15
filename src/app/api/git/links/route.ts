import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { parseProvider, validateRepoFullName, type GitProvider } from "@/lib/git/provider";
import { createAuditLog } from "@/lib/audit/logger";
import { AuditAction } from "@prisma/client";

function validateIssueUrl(url: string, provider?: GitProvider): boolean {
  try {
    const parsed = new URL(url);
    
    switch (provider) {
      case "GITHUB":
        return parsed.hostname === "github.com" && parsed.protocol === "https:";
      case "GITLAB":
        return (parsed.hostname === "gitlab.com" || parsed.hostname.endsWith(".gitlab.com")) && 
               parsed.protocol === "https:";
      case "CODECOMMIT":
        return parsed.hostname.includes("console.aws.amazon.com") && parsed.protocol === "https:";
      default:
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    }
  } catch {
    return false;
  }
}

async function checkTicketPermission(ticketId: string, userId: string, userRole: string, agentId?: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { assigneeId: true }
  });

  if (!ticket) {
    return { allowed: false, error: "Ticket not found", status: 404 };
  }

  const isAdmin = userRole === "ADMIN";
  const isAssignee = ticket.assigneeId === agentId;

  if (!isAdmin && !isAssignee) {
    return { allowed: false, error: "Forbidden: You can only manage issues for your assigned tickets", status: 403 };
  }

  return { allowed: true, ticket };
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

    const provider = parseProvider(body.provider);

    if (!validateIssueUrl(body.issueUrl.trim(), provider)) {
      return NextResponse.json(
        { error: `Invalid issueUrl for ${provider}.` },
        { status: 400 }
      );
    }

    const permission = await checkTicketPermission(body.ticketId, session.user.id, session.user.role, session.user.agentId);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: permission.status });
    }

    const repoFullName = validateRepoFullName(body.repoFullName);

    const existingLink = await prisma.gitLink.findFirst({
      where: {
        ticketId: body.ticketId,
        provider,
        repoFullName,
        issueNumber: Number(body.issueNumber)
      }
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "이미 동일한 이슈가 연결되어 있습니다.", existingLink },
        { status: 409 }
      );
    }

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
      actorType: session.user.role === "ADMIN" ? "ADMIN" : "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: AuditAction.CREATE,
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const linkId = request.nextUrl.searchParams.get("id");

    if (!linkId) {
      return NextResponse.json(
        { error: "linkId는 필수입니다." },
        { status: 400 }
      );
    }

    const link = await prisma.gitLink.findUnique({
      where: { id: linkId },
      include: { ticket: { select: { assigneeId: true } } }
    });

    if (!link) {
      return NextResponse.json(
        { error: "Git 링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isAssignee = link.ticket.assigneeId === session.user.agentId;

    if (!isAdmin && !isAssignee) {
      return NextResponse.json(
        { error: "Forbidden: You can only unlink issues from your assigned tickets" },
        { status: 403 }
      );
    }

    await prisma.gitLink.delete({
      where: { id: linkId }
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "ADMIN" : "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: AuditAction.DELETE,
      resourceType: "git_link",
      resourceId: linkId,
      description: `Git 이슈 연결 해제: ${link.provider} ${link.repoFullName}#${link.issueNumber}`,
      oldValue: {
        provider: link.provider,
        repoFullName: link.repoFullName,
        issueNumber: link.issueNumber,
        issueUrl: link.issueUrl
      },
      metadata: {
        ticketId: link.ticketId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Git links DELETE error:", error);
    return NextResponse.json(
      { error: "Git 이슈 연결 해제에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      linkId?: string;
      issueUrl?: string;
      issueNumber?: number;
    };

    if (!body.linkId || !body.issueUrl?.trim()) {
      return NextResponse.json(
        { error: "linkId와 issueUrl이 필요합니다." },
        { status: 400 }
      );
    }

    const link = await prisma.gitLink.findUnique({
      where: { id: body.linkId },
      include: { ticket: { select: { assigneeId: true } } }
    });

    if (!link) {
      return NextResponse.json(
        { error: "Git 링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!validateIssueUrl(body.issueUrl.trim(), link.provider)) {
      return NextResponse.json(
        { error: `Invalid issueUrl for ${link.provider}.` },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isAssignee = link.ticket.assigneeId === session.user.agentId;

    if (!isAdmin && !isAssignee) {
      return NextResponse.json(
        { error: "Forbidden: You can only update issues for your assigned tickets" },
        { status: 403 }
      );
    }

    const oldValue = {
      issueUrl: link.issueUrl,
      issueNumber: link.issueNumber
    };

    const updatedLink = await prisma.gitLink.update({
      where: { id: body.linkId },
      data: {
        issueUrl: body.issueUrl.trim(),
        issueNumber: body.issueNumber ?? link.issueNumber
      }
    });

    await createAuditLog({
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "ADMIN" : "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: AuditAction.UPDATE,
      resourceType: "git_link",
      resourceId: body.linkId,
      description: `Git 이슈 연결 수정: ${link.provider} ${link.repoFullName}`,
      oldValue,
      newValue: {
        issueUrl: body.issueUrl.trim(),
        issueNumber: body.issueNumber ?? link.issueNumber
      },
      metadata: {
        ticketId: link.ticketId
      }
    });

    return NextResponse.json({ link: updatedLink });
  } catch (error) {
    console.error("Git links PUT error:", error);
    return NextResponse.json(
      { error: "Git 이슈 연결 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
