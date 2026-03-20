import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ThumbsUp, ThumbsDown, Eye, Calendar, Ticket } from "lucide-react";

interface KnowledgeArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: KnowledgeArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug },
    select: { title: true, excerpt: true },
  });

  if (!article) {
    return { title: "문서를 찾을 수 없습니다" };
  }

  return {
    title: `${article.title} | Crinity Helpdesk`,
    description: article.excerpt || undefined,
  };
}

export default async function KnowledgeArticlePage({ params }: KnowledgeArticlePageProps) {
  const { slug } = await params;

  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!article || !article.isPublished || !article.isPublic) {
    notFound();
  }

  await prisma.knowledgeArticle.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  });

  const relatedArticles = await prisma.knowledgeArticle.findMany({
    where: {
      categoryId: article.categoryId,
      isPublished: true,
      isPublic: true,
      id: { not: article.id },
    },
    orderBy: { viewCount: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
    },
  });

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class='text-xl font-semibold mt-6 mb-3'>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1 class='text-2xl font-bold mt-8 mb-4'>$1</h1>")
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/`([^`]+)`/gim, "<code class='bg-gray-100 px-1 py-0.5 rounded text-sm'>$1</code>")
      .replace(/\n/gim, "<br />");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/knowledge"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            지식 목록으로
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{article.category.name}</Badge>
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {(article.viewCount + 1).toLocaleString()}
                  </span>
                </div>
                <CardTitle className="text-2xl">{article.title}</CardTitle>
                {article.excerpt && (
                  <p className="text-gray-600 mt-2">{article.excerpt}</p>
                )}
              </CardHeader>
              <CardContent>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
                />

                {article.tags && (article.tags as string[]).length > 0 && (
                  <div className="mt-8 pt-6 border-t">
                    <div className="flex flex-wrap gap-2">
                      {(article.tags as string[]).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-4">
                    이 문서가 도움이 되었나요?
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      도움이 되었어요
                    </Button>
                    <Button variant="outline" size="sm">
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      도움이 필요해요
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="py-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    원하는 답변을 찾지 못하셨나요?
                  </p>
                  <Button asChild>
                    <Link href="/ticket/new">
                      <Ticket className="h-4 w-4 mr-2" />
                      티켓 생성하기
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">관련 문서</CardTitle>
              </CardHeader>
              <CardContent>
                {relatedArticles.length > 0 ? (
                  <div className="space-y-3">
                    {relatedArticles.map((related) => (
                      <Link
                        key={related.id}
                        href={`/knowledge/${related.slug}`}
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <h4 className="font-medium text-sm hover:text-blue-600">
                          {related.title}
                        </h4>
                        {related.excerpt && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {related.excerpt}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    관련 문서가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">문의하기</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  추가 도움이 필요하시면 언제든지 문의해 주세요.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/ticket/new">티켓 생성</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
