import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { RequestTypeList } from "@/components/admin/request-type-list";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "문의 유형 설정 | Suppo",
};

export default async function RequestTypesPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsRequestTypes}
        description="문의 유형과 자동 분류 정책은 관리자만 변경할 수 있습니다."
      />
    );
  }

  const [requestTypes, teams] = await Promise.all([
    prisma.requestType.findMany({
      include: {
        defaultTeam: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copy.settingsRequestTypes}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{copy.settingsRequestTypes}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            고객이 선택할 수 있는 문의 유형을 관리합니다. 각 유형별로 기본 담당 팀과 우선순위를 설정할 수 있습니다.
          </p>
          <RequestTypeList requestTypes={requestTypes} teams={teams} />
        </CardContent>
      </Card>
    </div>
  );
}
