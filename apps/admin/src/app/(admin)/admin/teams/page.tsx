import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { TeamList } from "@/components/admin/team-list";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";
import { copyText } from "@/lib/i18n/admin-copy-utils";

export const metadata: Metadata = {
  title: "팀 관리 | Suppo",
};

export default async function TeamsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return (
      <AdminOnlyPageState
        title={copy.navTeams}
        description={t("teamsAdminOnlyDesc", "팀 구성과 배정 정책은 관리자만 변경할 수 있습니다.", "Only admins can change team structure and assignment policies.")}
      />
    );
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
          <h1 className="text-2xl font-bold text-foreground">{copy.navTeams}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("teamsPageDescription", "팀 생성, 수정, 상담원 배정 관리", "Create teams, edit them, and manage agent assignments.")}
          </p>
        </div>
      </div>

      <TeamList teams={teams} agents={agents} />
    </div>
  );
}
