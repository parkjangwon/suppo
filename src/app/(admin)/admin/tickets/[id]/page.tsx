import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { AdminShell } from "@/components/app/admin-shell";
import { TicketDetail } from "@/components/admin/ticket-detail";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "티켓 상세 | Crinity",
};

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      category: true,
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
    },
  });

  if (!ticket) {
    redirect("/admin/tickets");
  }

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const isAdmin = session.user.role === "ADMIN";
  const currentAgentId = session.user.agentId;

  return (
    <AdminShell>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/tickets">
            <Button variant="outline">← 목록으로</Button>
          </Link>
          <Link href="/admin/dashboard">
            <Button variant="outline">대시보드</Button>
          </Link>
        </div>

        <TicketDetail
          ticket={ticket}
          agents={agents}
          isAdmin={isAdmin}
          currentAgentId={currentAgentId}
        />
      </div>
    </AdminShell>
  );
}
