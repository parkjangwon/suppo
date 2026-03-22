import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuditLogList } from "@/components/admin/audit-log-list";
import { prisma } from "@crinity/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "감사 로그 | Crinity",
};

export default async function AdminAuditLogsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    redirect("/admin/dashboard");
  }

  const llmSettings = await prisma.lLMSettings.findFirst();
  const analysisEnabled = llmSettings?.analysisEnabled ?? false;

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
          <h1 className="text-2xl font-bold">
            감사 로그
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            시스템 내 모든 활동 내역을 조회하고 추적합니다.
          </p>
        </div>
      </div>

      <AuditLogList initialLogs={serializedLogs} initialPagination={initialPagination} analysisEnabled={analysisEnabled} />
    </div>
  );
}
