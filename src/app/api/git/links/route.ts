import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { parseProvider, validateRepoFullName } from "@/lib/git/provider";

export async function GET(request: NextRequest) {
  const ticketId = request.nextUrl.searchParams.get("ticketId");

  if (!ticketId) {
    return NextResponse.json({ error: "ticketId는 필수입니다." }, { status: 400 });
  }

  const links = await prisma.gitLink.findMany({
    where: { ticketId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unique constraint") || error.message.includes("P2002"))
    ) {
      return NextResponse.json({ error: "이미 연결된 이슈입니다." }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Git 이슈 연결에 실패했습니다: ${message}` },
      { status: 400 }
    );
  }
}
