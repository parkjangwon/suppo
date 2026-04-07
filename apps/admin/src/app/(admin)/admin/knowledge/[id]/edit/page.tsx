import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { KnowledgeForm } from "@/components/admin/knowledge-form";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "지식 문서 수정 | Crinity",
};

interface EditKnowledgePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditKnowledgePage({ params }: EditKnowledgePageProps) {
  const copy = getAdminCopy((await cookies()).get("crinity-admin-locale")?.value);
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/admin/login");
  }

  const [article, categories] = await Promise.all([
    prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.knowledgeCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!article) {
    notFound();
  }

  const canEdit =
    session.user.role === "ADMIN" || article.authorId === session.user.agentId;

  if (!canEdit) {
    redirect("/admin/knowledge");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copy.commonEdit} {copy.knowledgeTitle}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{copy.commonEdit}</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm article={article} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
