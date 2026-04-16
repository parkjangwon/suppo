import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Button } from "@crinity/ui/components/ui/button";
import { Badge } from "@crinity/ui/components/ui/badge";
import { MarkdownContent } from "@crinity/shared/components/markdown-content";
import { ChevronLeft, Eye, Ticket } from "lucide-react";
import { ArticleFeedback } from "@/components/knowledge/article-feedback";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { getPublicCopy } from "@crinity/shared/i18n/public-copy";

interface KnowledgeArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: KnowledgeArticlePageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([
    params,
    cookies().then((c) => c.get("crinity-locale")?.value),
  ]);
  const copy = getPublicCopy(locale);

  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug },
    select: { title: true, excerpt: true },
  });

  if (!article) {
    return { title: copy.knowledgeArticleNotFound };
  }

  return {
    title: `${article.title} | Crinity Helpdesk`,
    description: article.excerpt || undefined,
  };
}

export default async function KnowledgeArticlePage({ params }: KnowledgeArticlePageProps) {
  const [{ slug }, locale] = await Promise.all([
    params,
    cookies().then((c) => c.get("crinity-locale")?.value),
  ]);

  const branding = await getSystemBranding();
  if (!branding.knowledgeEnabled) {
    notFound();
  }

  const copy = getPublicCopy(locale);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/knowledge"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {copy.knowledgeBackToList}
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
                <MarkdownContent content={article.content} />

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
                    {copy.knowledgeArticleHelpfulQuestion}
                  </p>
                  <ArticleFeedback articleId={article.id} />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="py-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    {copy.knowledgeNoAnswerFound}
                  </p>
                  <Button asChild>
                    <Link href="/ticket/new">
                      <Ticket className="h-4 w-4 mr-2" />
                      {copy.knowledgeCreateTicketAction}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{copy.knowledgeRelatedArticles}</CardTitle>
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
                    {copy.knowledgeNoRelatedArticles}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">{copy.knowledgeContactTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {copy.knowledgeContactText}
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/ticket/new">{copy.knowledgeContactTicketButton}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
