import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { TicketList } from "@/components/admin/ticket-list";
import { Prisma, TicketStatus, TicketPriority } from "@prisma/client";
import { getVIPCustomers } from "@/lib/db/queries/admin-analytics/vip-customers";

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
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : undefined;
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : undefined;
  const queue = typeof params.queue === "string" ? params.queue : undefined;
  const customerSegment = typeof params.customerSegment === "string" ? params.customerSegment : undefined;
  const slaState = typeof params.slaState === "string" ? params.slaState : undefined;

  const andFilters: Prisma.TicketWhereInput[] = [];

  if (status && status !== "all") {
    andFilters.push({ status: status as TicketStatus });
  }
  if (priority && priority !== "all") {
    andFilters.push({ priority: priority as TicketPriority });
  }
  if (categoryId && categoryId !== "all") {
    andFilters.push({ categoryId });
  }
  if (assigneeId && assigneeId !== "all") {
    if (assigneeId === "unassigned") {
      andFilters.push({ assigneeId: null });
    } else {
      andFilters.push({ assigneeId });
    }
  }
  if (search) {
    andFilters.push({
      OR: [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { customerEmail: { contains: search } },
      ],
    });
  }
  if (dateFrom || dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    }
    andFilters.push({ createdAt });
  }

  if (queue === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    andFilters.push({
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      createdAt: { gte: startOfDay },
    });
  }

  if (customerSegment === "vip") {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    const vipCustomers = await getVIPCustomers({ from, to: now });
    const customerIds = vipCustomers.customers
      .map((customer) => customer.customerId)
      .filter((value): value is string => Boolean(value));
    const customerEmails = vipCustomers.customers.map((customer) => customer.customerEmail);

    const vipConditions: Prisma.TicketWhereInput[] = [];
    if (customerIds.length > 0) {
      vipConditions.push({ customerId: { in: customerIds } });
    }
    if (customerEmails.length > 0) {
      vipConditions.push({ customerEmail: { in: customerEmails } });
    }
    if (vipConditions.length > 0) {
      andFilters.push({ OR: vipConditions });
    }
  }

  if (slaState === "warning") {
    andFilters.push({
      slaClocks: {
        some: {
          status: { in: ["RUNNING", "PAUSED"] },
          warningSentAt: { not: null },
          breachedAt: null,
        },
      },
    });
  }

  if (slaState === "breached") {
    andFilters.push({
      slaClocks: {
        some: {
          breachedAt: { not: null },
        },
      },
    });
  }

  const where: Prisma.TicketWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      category: true,
      requestType: {
        select: { id: true, name: true },
      },
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
        currentAgentId={session.user.agentId ?? undefined}
        currentFilter={{
          queue,
          status,
          priority,
          categoryId,
          assigneeId,
          search,
          customerSegment,
          slaState,
          dateFrom,
          dateTo,
        }}
      />
    </div>
  );
}
