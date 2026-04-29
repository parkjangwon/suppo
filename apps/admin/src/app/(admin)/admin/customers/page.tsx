import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { CustomerList } from "@/components/admin/customer-list";
import { prisma } from "@suppo/db";
import { Prisma } from "@prisma/client";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "고객 관리 | Suppo",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return (
      <AdminOnlyPageState
        title={copy.navCustomers}
        description="고객 목록과 메모 관리는 관리자만 접근할 수 있습니다."
      />
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            고객 관리
          </h1>
        </div>
        <p className="text-muted-foreground">
          DATABASE_URL이 설정되지 않아 목록을 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  const PAGE_SIZE = 50;
  const params = await searchParams;
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const search = typeof params.search === "string" ? params.search.trim() : undefined;

  const where: Prisma.CustomerWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : undefined;

  const totalCount = await prisma.customer.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { lastTicketAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const serializedCustomers = customers.map(customer => ({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    lastTicketAt: customer.lastTicketAt?.toISOString() || null,
  }));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{copy.navCustomers}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            고객 목록 조회 및 관리
          </p>
        </div>
      </div>

      <CustomerList
        initialCustomers={serializedCustomers}
        page={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        search={search}
      />
    </div>
  );
}
