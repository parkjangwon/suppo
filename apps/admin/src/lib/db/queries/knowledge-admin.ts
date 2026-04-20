import { prisma } from "@suppo/db";
import type {
  KnowledgeArticleListItem,
  KnowledgeArticleDetail,
  KnowledgeCategory,
  KnowledgeContributor,
  KnowledgeFilters,
} from "@suppo/shared/knowledge/types";

export async function getKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  const categories = await prisma.knowledgeCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { articles: true },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive,
    articleCount: cat._count.articles,
  }));
}

export async function getAllKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  const categories = await prisma.knowledgeCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { articles: true },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive,
    articleCount: cat._count.articles,
  }));
}

export async function getKnowledgeArticles(
  filters: KnowledgeFilters = {}
): Promise<KnowledgeArticleListItem[]> {
  const where: any = {};

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.status === "published") {
    where.isPublished = true;
  } else if (filters.status === "draft") {
    where.isPublished = false;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { content: { contains: filters.search } },
      { excerpt: { contains: filters.search } },
    ];
  }

  if (filters.tags && filters.tags.length > 0) {
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      author: {
        select: { id: true, name: true },
      },
    },
  });

  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    category: article.category,
    isPublished: article.isPublished,
    isPublic: article.isPublic,
    viewCount: article.viewCount,
    tags: (article.tags as string[]) || [],
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    publishedAt: article.publishedAt,
    author: article.author,
  }));
}

export async function getKnowledgeArticleById(
  id: string
): Promise<KnowledgeArticleDetail | null> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      author: {
        select: { id: true, name: true },
      },
      lastEditedBy: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          feedback: {
            where: { wasHelpful: true },
          },
        },
      },
    },
  });

  if (!article) return null;

  const feedbackStats = await prisma.knowledgeArticleFeedback.groupBy({
    by: ["wasHelpful"],
    where: { articleId: id },
    _count: { articleId: true },
  });

  const helpfulCount = feedbackStats.find((s) => s.wasHelpful)?._count.articleId || 0;
  const notHelpfulCount = feedbackStats.find((s) => !s.wasHelpful)?._count.articleId || 0;

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    isPublished: article.isPublished,
    isPublic: article.isPublic,
    viewCount: article.viewCount,
    tags: (article.tags as string[]) || [],
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    publishedAt: article.publishedAt,
    author: article.author,
    lastEditedBy: article.lastEditedBy,
    helpfulCount,
    notHelpfulCount,
  };
}

export async function getKnowledgeArticleBySlug(
  slug: string
): Promise<KnowledgeArticleDetail | null> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      author: {
        select: { id: true, name: true },
      },
      lastEditedBy: {
        select: { id: true, name: true },
      },
    },
  });

  if (!article) return null;

  const feedbackStats = await prisma.knowledgeArticleFeedback.groupBy({
    by: ["wasHelpful"],
    where: { articleId: article.id },
    _count: { articleId: true },
  });

  const helpfulCount = feedbackStats.find((s) => s.wasHelpful)?._count.articleId || 0;
  const notHelpfulCount = feedbackStats.find((s) => !s.wasHelpful)?._count.articleId || 0;

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    isPublished: article.isPublished,
    isPublic: article.isPublic,
    viewCount: article.viewCount,
    tags: (article.tags as string[]) || [],
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    publishedAt: article.publishedAt,
    author: article.author,
    lastEditedBy: article.lastEditedBy,
    helpfulCount,
    notHelpfulCount,
  };
}

export async function getKnowledgeContributors(): Promise<KnowledgeContributor[]> {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      authoredKnowledge: {
        select: {
          id: true,
          isPublished: true,
          viewCount: true,
          updatedAt: true,
        },
      },
    },
  });

  const agentsWithArticles = agents.filter((a) => a.authoredKnowledge.length > 0);
  if (agentsWithArticles.length === 0) return [];

  const allArticleIds = agentsWithArticles.flatMap((a) =>
    a.authoredKnowledge.map((k) => k.id)
  );

  const feedbackStats = await prisma.knowledgeArticleFeedback.groupBy({
    by: ["articleId", "wasHelpful"],
    where: { articleId: { in: allArticleIds } },
    _count: { articleId: true },
  });

  const feedbackMap = new Map<string, { helpful: number; total: number }>();
  for (const stat of feedbackStats) {
    const existing = feedbackMap.get(stat.articleId) || { helpful: 0, total: 0 };
    existing.total += stat._count.articleId;
    if (stat.wasHelpful) {
      existing.helpful += stat._count.articleId;
    }
    feedbackMap.set(stat.articleId, existing);
  }

  const contributors: KnowledgeContributor[] = [];

  for (const agent of agentsWithArticles) {
    const articleIds = agent.authoredKnowledge.map((a) => a.id);

    let helpfulCount = 0;
    let totalFeedback = 0;
    for (const id of articleIds) {
      const stats = feedbackMap.get(id);
      if (stats) {
        helpfulCount += stats.helpful;
        totalFeedback += stats.total;
      }
    }

    const totalViews = agent.authoredKnowledge.reduce((sum, a) => sum + a.viewCount, 0);
    const publishedCount = agent.authoredKnowledge.filter((a) => a.isPublished).length;
    const lastContribution = agent.authoredKnowledge.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0];

    contributors.push({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      articleCount: agent.authoredKnowledge.length,
      publishedCount,
      totalViews,
      helpfulRate: totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0,
      lastContributionAt: lastContribution?.updatedAt || null,
    });
  }

  return contributors.sort((a, b) => b.articleCount - a.articleCount);
}

export async function checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const where: any = { slug };
  if (excludeId) {
    where.id = { not: excludeId };
  }

  const count = await prisma.knowledgeArticle.count({ where });
  return count > 0;
}

export async function checkCategorySlugExists(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const where: any = { slug };
  if (excludeId) {
    where.id = { not: excludeId };
  }

  const count = await prisma.knowledgeCategory.count({ where });
  return count > 0;
}
