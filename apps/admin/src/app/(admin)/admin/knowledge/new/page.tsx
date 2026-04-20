import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { KnowledgeForm } from "@/components/admin/knowledge-form";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "새 지식 문서 | Suppo",
};

export default async function NewKnowledgePage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const categories = await prisma.knowledgeCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copy.knowledgeNewArticle}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{copy.commonCreate} {copy.knowledgeTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
