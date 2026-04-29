import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { KnowledgeList } from "@/components/admin/knowledge-list";
import { getPublicAppUrl } from "@suppo/shared/utils/public-app-url";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "지식 관리 | Suppo",
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();
  const publicBaseUrl = getPublicAppUrl();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const PAGE_SIZE = 30;
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const search = typeof params.search === "string" ? params.search.trim() : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;

  const where: Prisma.KnowledgeArticleWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
    ];
  }

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }

  if (status === "published") {
    where.isPublished = true;
  } else if (status === "draft") {
    where.isPublished = false;
  }

  const [totalCount, categories] = await Promise.all([
    prisma.knowledgeArticle.count({ where }),
    prisma.knowledgeCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copy.navKnowledge}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{copy.knowledgeTitle}</CardTitle>
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
            publicBaseUrl={publicBaseUrl}
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            search={search}
            categoryId={categoryId}
            status={status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
