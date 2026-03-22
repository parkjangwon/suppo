import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { RequestTypeList } from "@/components/admin/request-type-list";

export const metadata: Metadata = {
  title: "문의 유형 설정 | Crinity",
};

export default async function RequestTypesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
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
      <h1 className="text-2xl font-bold mb-6">문의 유형 설정</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>문의 유형 관리</CardTitle>
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
