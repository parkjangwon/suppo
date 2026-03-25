import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Badge } from "@crinity/ui/components/ui/badge";
import { BookOpen, ChevronRight, X } from "lucide-react";
import { KnowledgeSearchInput } from "@/components/knowledge/knowledge-search-input";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { getPublicCopy } from "@crinity/shared/i18n/public-copy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get("crinity-locale")?.value;
  const copy = getPublicCopy(locale);
  return {
    title: copy.knowledgePageTitle,
    description: copy.knowledgePageDescription,
  };
}

interface KnowledgePageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const [{ category: categorySlug, q }, branding, locale] = await Promise.all([
    searchParams,
    getSystemBranding(),
    cookies().then((c) => c.get("crinity-locale")?.value),
  ]);

  if (!branding.knowledgeEnabled) {
    notFound();
  }

  const copy = getPublicCopy(locale);

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
            <h1 className="text-3xl font-bold mb-4">{copy.knowledgeHeading}</h1>
            <p className="text-gray-600 mb-6">
              {copy.knowledgeSubheading}
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
                <CardTitle className="text-lg">{copy.knowledgeCategories}</CardTitle>
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
                    <span>{copy.knowledgeCategoryAll}</span>
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
                    <span>{copy.knowledgeFilterSearchLabel} {q}</span>
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
                    <span>{copy.knowledgeFilterCategoryLabel} {activeCategory.name}</span>
                    <Link
                      href={q ? `/knowledge?q=${encodeURIComponent(q)}` : "/knowledge"}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                <span className="text-sm text-gray-500">{articles.length}{copy.knowledgeResultCountSuffix}</span>
              </div>
            )}

            {/* 필터 결과 */}
            {isFiltered && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {q
                      ? `${copy.knowledgeSearchResultsPrefix}"${q}"${copy.knowledgeSearchResultsSuffix}`
                      : activeCategory?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {articles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium mb-1">{copy.knowledgeNoResults}</p>
                      <p className="text-sm">{copy.knowledgeNoResultsSubtext}</p>
                      <Link
                        href="/ticket/new"
                        className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                      >
                        {copy.knowledgeContactViaTicket}
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
                                {copy.knowledgeViewCountPrefix}{article.viewCount.toLocaleString()}
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
                    {copy.knowledgePopularArticles}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {popularArticles.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {copy.knowledgeNoArticles}
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
                                  {copy.knowledgeViewCountPrefix}{article.viewCount.toLocaleString()}
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
                  {copy.knowledgeFooterCtaBefore}
                  <Link href="/ticket/new" className="text-blue-600 hover:underline">
                    {copy.knowledgeFooterCtaLink}
                  </Link>
                  {copy.knowledgeFooterCtaAfter}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
