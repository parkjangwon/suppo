import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { CustomerList } from "@/components/admin/customer-list";
import { prisma } from "@suppo/db";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "고객 관리 | Suppo",
};

export default async function AdminCustomersPage() {
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

  const customers = await prisma.customer.findMany({
    orderBy: { lastTicketAt: "desc" },
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

      <CustomerList initialCustomers={serializedCustomers} />
    </div>
  );
}
