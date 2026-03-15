import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { TicketDetail } from "@/components/admin/ticket-detail";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "티켓 상세 | Crinity Helpdesk",
  description: "티켓 상세 정보 및 관리",
};

interface TicketDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  const agent = session.user;

  try {
    const { id } = await params;
    const [ticket, agents] = await Promise.all([
      prisma.ticket.findUnique({
        where: { id },
        include: {
          category: true,
          requestType: {
            select: { id: true, name: true },
          },
          assignee: {
            select: { id: true, name: true },
          },
          comments: {
            include: {
              attachments: {
                select: { id: true, fileName: true, fileUrl: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          activities: {
            include: {
              actor: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          gitLinks: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);

    if (!ticket) {
      notFound();
    }

    return (
      <div className="container mx-auto py-10 max-w-5xl">
        <div className="mb-6">
          <Button variant="ghost" asChild className="-ml-4">
            <Link href="/admin/tickets">
              <ChevronLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Link>
          </Button>
        </div>

        <TicketDetail 
          ticket={ticket} 
          agents={agents} 
          currentAgentId={agent.id || ""} 
          isAdmin={agent.role === "ADMIN"} 
        />
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return (
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground mb-8">
            이 티켓을 볼 수 있는 권한이 없습니다.
          </p>
          <Button asChild>
            <Link href="/admin/tickets">목록으로 돌아가기</Link>
          </Button>
        </div>
      );
    }
    throw error;
  }
}
