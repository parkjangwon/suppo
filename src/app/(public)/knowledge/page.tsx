import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "지식 찾기 | Crinity Helpdesk",
  description: "자주 묻는 질문과 도움말을 찾아보세요",
};

export default async function KnowledgePage() {
  const [categories, popularArticles] = await Promise.all([
    prisma.knowledgeCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                isPublished: true,
                isPublic: true,
              },
            },
          },
        },
      },
    }),
    prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        isPublic: true,
      },
      orderBy: { viewCount: "desc" },
      take: 6,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">무엇을 도와드릴까요?</h1>
            <p className="text-gray-600 mb-6">
              자주 묻는 질문과 도움말을 검색필요하신 내용을 검색필요하신 내용을 검색필요하신 내용을 검색하세요
            </p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="검색어를 입력하세요..."
                className="pl-12 h-14 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">카테고리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/knowledge?category=${category.slug}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span>{category.name}</span>
                      <Badge variant="secondary">
                        {category._count.articles}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  인기 문서
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">새로운 문서</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center py-8">
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
