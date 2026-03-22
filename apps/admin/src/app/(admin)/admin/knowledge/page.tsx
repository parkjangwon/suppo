import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { KnowledgeList } from "@/components/admin/knowledge-list";

export const metadata: Metadata = {
  title: "지식 관리 | Crinity",
};

export default async function KnowledgePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const [articles, categories] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { feedback: true },
        },
      },
    }),
    prisma.knowledgeCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">지식 관리</h1>

      <Card>
        <CardHeader>
          <CardTitle>지식 문서 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            고객과 상담원을 위한 지식 문서를 관리합니다. 공개된 문서는 고객 포털에서 검색되어 볼 수 있습니다.
          </p>
          <KnowledgeList
            articles={articles}
            categories={categories}
            currentUserId={session.user.id}
            isAdmin={session.user.role === "ADMIN"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
