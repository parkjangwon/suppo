import { prisma } from "@suppo/db";

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName: string;
  viewCount: number;
  helpfulCount: number;
}

export async function findRelatedArticles(
  articleId: string,
  limit: number = 5
): Promise<RelatedArticle[]> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: articleId },
    include: { category: true }
  });

  if (!article) return [];

  // Find articles in same category, excluding current
  const related = await prisma.knowledgeArticle.findMany({
    where: {
      id: { not: articleId },
      categoryId: article.categoryId,
      isPublished: true,
      isPublic: true
    },
    include: {
      category: true,
      feedback: true
    },
    take: limit
  });

  return related.map(a => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? a.content.slice(0, 150) + "...",
    categoryName: a.category?.name ?? "일반",
    viewCount: a.viewCount,
    helpfulCount: a.feedback.filter(f => f.wasHelpful).length
  }));
}

export function calculateSearchRelevance(
  query: string,
  title: string,
  content: string
): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  let score = 0;
  
  // Title match weighted heavily
  if (titleLower === queryLower) score += 100;
  else if (titleLower.includes(queryLower)) score += 50;
  else if (titleLower.split(" ").some(word => queryLower.includes(word))) score += 25;
  
  // Content match
  const contentMatches = (contentLower.match(new RegExp(queryLower, "g")) || []).length;
  score += Math.min(contentMatches * 5, 30);
  
  return score;
}
