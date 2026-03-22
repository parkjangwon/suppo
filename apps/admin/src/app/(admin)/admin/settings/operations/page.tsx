import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { HelpdeskOperationsCenter } from "@/components/admin/helpdesk-operations-center";

export const metadata: Metadata = {
  title: "운영 정책 | Crinity",
};

export default async function OperationsSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title="운영 정책"
        description="SLA, 자동화, 큐, 연동 정책은 관리자만 변경할 수 있습니다."
      />
    );
  }

  const [agents, teams] = await Promise.all([
    prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">운영 정책</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SLA, 자동화 규칙, 운영 큐, 연동, AI 운영 기준을 한 곳에서 관리합니다.
        </p>
      </div>

      <HelpdeskOperationsCenter
        currentAgentId={session.user.agentId ?? undefined}
        agents={agents}
        teams={teams}
      />
    </div>
  );
}
