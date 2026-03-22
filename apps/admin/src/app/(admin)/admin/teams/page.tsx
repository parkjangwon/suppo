import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { TeamList } from "@/components/admin/team-list";

export const metadata: Metadata = {
  title: "팀 관리 | Crinity",
};

export default async function TeamsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    redirect("/admin/dashboard");
  }

  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: {
          agent: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { tickets: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">팀 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            팀 생성, 수정, 상담원 배정 관리
          </p>
        </div>
      </div>

      <TeamList teams={teams} agents={agents} />
    </div>
  );
}
