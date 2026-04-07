import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AgentList } from "@/components/admin/agent-list";
import { AgentAiSection } from "@/components/admin/agent-ai-section";
import { prisma } from "@crinity/db";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "상담원 관리 | Crinity",
};

export default async function AdminAgentsPage() {
  const copy = getAdminCopy((await cookies()).get("crinity-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  if (!process.env.DATABASE_URL) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            상담원 관리
          </h1>
        </div>
        <p className="text-muted-foreground">
          DATABASE_URL이 설정되지 않아 목록을 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  const now = new Date();

  const llmSettings = await prisma.lLMSettings.findFirst();
  const analysisEnabled = llmSettings?.analysisEnabled ?? false;

  const [agents, categories, teams] = await Promise.all([
    prisma.agent.findMany({
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        teamMemberships: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
        absences: {
          where: {
            startDate: { lte: now },
            endDate: { gte: now },
          },
          take: 1,
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true,
          },
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ["OPEN", "IN_PROGRESS", "WAITING"],
                },
              },
            },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{copy.navAgents}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            상담원 추가, 수정, 팀 배정 및 권한 관리
          </p>
        </div>
      </div>

      {isAdmin && analysisEnabled && <AgentAiSection />}

      <AgentList
        initialAgents={agents}
        categories={categories}
        teams={teams}
        isAdmin={isAdmin}
      />
    </div>
  );
}
