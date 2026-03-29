import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { HelpdeskOperationsCenter } from "@/components/admin/helpdesk-operations-center";

export const metadata: Metadata = {
  title: "업무 규칙 | Crinity",
};

export default async function OperationsSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title="업무 규칙"
        description="응답 목표, 자동 처리, 작업 바로가기는 관리자만 변경할 수 있습니다."
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
        <h1 className="text-2xl font-bold">업무 규칙</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          상담원이 일하는 방식에 직접 영향을 주는 응답 목표, 자동 처리, 작업 바로가기를 관리합니다.
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
