import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { TemplateList } from "@/components/admin/template-list";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "응답 템플릿 관리 | Suppo",
};

export default async function TemplatesPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  const [templates, categories, requestTypes] = await Promise.all([
    prisma.responseTemplate.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [
              { createdById: session.user.id },
              { isShared: true },
            ],
          },
      include: {
        category: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.requestType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copy.navTemplates}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{copy.templatesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            자주 사용하는 응답 템플릿을 관리합니다. 템플릿은 변수를 사용하여 동적으로 내용을 생성할 수 있습니다.
          </p>
          <TemplateList 
            templates={templates} 
            categories={categories}
            requestTypes={requestTypes}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
