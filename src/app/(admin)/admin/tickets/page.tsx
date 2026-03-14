import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { TicketList } from "@/components/admin/ticket-list";
import { Prisma, TicketStatus, TicketPriority } from "@prisma/client";

export const metadata: Metadata = {
  title: "티켓 목록 | Crinity",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const params = await searchParams;

  const status = typeof params.status === "string" ? params.status : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const assigneeId = typeof params.assigneeId === "string" ? params.assigneeId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const where: Prisma.TicketWhereInput = {};

  if (status && status !== "all") {
    where.status = status as TicketStatus;
  }
  if (priority && priority !== "all") {
    where.priority = priority as TicketPriority;
  }
  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }
  if (assigneeId && assigneeId !== "all") {
    if (assigneeId === "unassigned") {
      where.assigneeId = null;
    } else {
      where.assigneeId = assigneeId;
    }
  }
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">티켓 목록</h1>
      </div>

      <TicketList
        tickets={tickets}
        categories={categories}
        agents={agents}
      />
    </div>
  );
}
