import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Badge } from "@crinity/ui/components/ui/badge";
import { BookOpen, ChevronRight, X } from "lucide-react";
import { KnowledgeSearchInput } from "@/components/knowledge/knowledge-search-input";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";

export const metadata: Metadata = {
  title: "지식 찾기 | Crinity Helpdesk",
  description: "자주 묻는 질문과 도움말을 찾아보세요",
};

interface KnowledgePageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const [{ category: categorySlug, q }, branding] = await Promise.all([
    searchParams,
    getSystemBranding(),
  ]);

  if (!branding.knowledgeEnabled) {
    notFound();
  }

  const categories = await prisma.knowledgeCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: {
          articles: { where: { isPublished: true, isPublic: true } },
        },
      },
    },
  });

  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null;

  // 검색어 키워드 분리
  const keywords = q
    ? q.split(/\s+/).filter((k) => k.length >= 1)
    : [];

  const where: Record<string, unknown> = {
    isPublished: true,
    isPublic: true,
  };

  if (activeCategory) {
    where.categoryId = activeCategory.id;
  }

  if (keywords.length > 0) {
    where.OR = keywords.flatMap((kw) => [
      { title: { contains: kw } },
      { content: { contains: kw } },
      { excerpt: { contains: kw } },
    ]);
  }

  const isFiltered = !!activeCategory || !!q;

  const [articles, popularArticles] = await Promise.all([
    isFiltered
      ? prisma.knowledgeArticle.findMany({
          where,
          orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
          take: 30,
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        })
      : Promise.resolve([]),
    !isFiltered
      ? prisma.knowledgeArticle.findMany({
          where: { isPublished: true, isPublic: true },
          orderBy: { viewCount: "desc" },
          take: 6,
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 검색 헤더 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">무엇을 도와드릴까요?</h1>
            <p className="text-gray-600 mb-6">
              자주 묻는 질문과 도움말을 검색하세요
            </p>
            <Suspense>
              <KnowledgeSearchInput defaultValue={q} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 좌측 카테고리 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">카테고리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <Link
                    href="/knowledge"
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      !activeCategory && !q
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <span>전체</span>
                    <Badge variant="secondary">
                      {categories.reduce((s, c) => s + c._count.articles, 0)}
                    </Badge>
                  </Link>
                  {categories.map((category) => {
                    const isActive = activeCategory?.id === category.id;
                    // 카테고리 선택 시 검색어 유지
                    const href = q
                      ? `/knowledge?category=${category.slug}&q=${encodeURIComponent(q)}`
                      : `/knowledge?category=${category.slug}`;
                    return (
                      <Link
                        key={category.id}
                        href={isActive ? (q ? `/knowledge?q=${encodeURIComponent(q)}` : "/knowledge") : href}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <span>{category.name}</span>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {category._count.articles}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 우측 콘텐츠 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 활성 필터 표시 */}
            {isFiltered && (
              <div className="flex flex-wrap items-center gap-2">
                {q && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <span>검색: {q}</span>
                    <Link
                      href={activeCategory ? `/knowledge?category=${activeCategory.slug}` : "/knowledge"}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                {activeCategory && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <span>카테고리: {activeCategory.name}</span>
                    <Link
                      href={q ? `/knowledge?q=${encodeURIComponent(q)}` : "/knowledge"}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                <span className="text-sm text-gray-500">{articles.length}건</span>
              </div>
            )}

            {/* 필터 결과 */}
            {isFiltered && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {q ? `"${q}" 검색 결과` : activeCategory?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {articles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium mb-1">검색 결과가 없습니다</p>
                      <p className="text-sm">다른 검색어나 카테고리를 시도해보세요.</p>
                      <Link
                        href="/ticket/new"
                        className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                      >
                        티켓으로 문의하기 →
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {articles.map((article) => (
                        <Link
                          key={article.id}
                          href={`/knowledge/${article.slug}`}
                          className="group flex items-start justify-between py-4 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                              {article.title}
                            </h3>
                            {article.excerpt && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {article.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {article.category.name}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                조회 {article.viewCount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors mt-0.5 flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 기본 화면: 인기 문서 */}
            {!isFiltered && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    인기 문서
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {popularArticles.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      아직 게시된 문서가 없습니다.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {popularArticles.map((article) => (
                        <Link
                          key={article.id}
                          href={`/knowledge/${article.slug}`}
                          className="group p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                                {article.title}
                              </h3>
                              {article.excerpt && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {article.excerpt}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" className="text-xs">
                                  {article.category.name}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  조회 {article.viewCount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="py-6">
                <p className="text-gray-600 text-center">
                  원하는 내용을 찾지 못하셨나요?{" "}
                  <Link href="/ticket/new" className="text-blue-600 hover:underline">
                    티켓을 생성
                  </Link>
                  하여 문의해 주세요.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
