import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { AdminShell } from "@/components/app/admin-shell";
import { TicketList } from "@/components/admin/ticket-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "티켓 목록 | Crinity",
};

export default async function TicketsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const tickets = await prisma.ticket.findMany({
    include: {
      category: true,
      assignee: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return (
    <AdminShell>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">티켓 목록</h1>
          <Link href="/admin/dashboard">
            <Button variant="outline">대시보드</Button>
          </Link>
        </div>

        <TicketList
          tickets={tickets}
          categories={categories}
          agents={agents}
        />
      </div>
    </AdminShell>
  );
}
