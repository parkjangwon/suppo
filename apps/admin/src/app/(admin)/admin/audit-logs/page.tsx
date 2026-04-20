import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { AuditLogList } from "@/components/admin/audit-log-list";
import { prisma } from "@suppo/db";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";
import { getAnalysisEnabled } from "@/lib/settings/get-analysis-enabled";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "감사 로그 | Suppo",
};

export default async function AdminAuditLogsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return (
      <AdminOnlyPageState
        title={copy.navAuditLogs}
        description="시스템 감사 로그는 관리자만 조회할 수 있습니다."
      />
    );
  }

  const analysisEnabled = await getAnalysisEnabled();

  const limit = 20;
  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedLogs = logs.map((log: any) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  const initialPagination = {
    total,
    page: 1,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{copy.navAuditLogs}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            시스템 내 모든 활동 내역을 조회하고 추적합니다.
          </p>
        </div>
      </div>

      <AuditLogList initialLogs={serializedLogs} initialPagination={initialPagination} analysisEnabled={analysisEnabled} />
    </div>
  );
}
