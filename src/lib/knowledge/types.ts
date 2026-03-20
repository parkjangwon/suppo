export interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  articleCount?: number;
}

export interface KnowledgeArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  isPublished: boolean;
  isPublic: boolean;
  viewCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  author?: {
    id: string;
    name: string;
  };
}

export interface KnowledgeArticleDetail extends KnowledgeArticleListItem {
  content: string;
  author: {
    id: string;
    name: string;
  };
  lastEditedBy: {
    id: string;
    name: string;
  } | null;
  helpfulCount: number;
  notHelpfulCount: number;
}

export interface KnowledgeArticlePublicDetail {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  tags: string[];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  authorDisplayName: string;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName: string;
  categorySlug: string;
}

export interface KnowledgeContributor {
  id: string;
  name: string;
  email: string;
  articleCount: number;
  publishedCount: number;
  totalViews: number;
  helpfulRate: number;
  lastContributionAt: Date | null;
}

export interface KnowledgeFilters {
  categoryId?: string;
  status?: "all" | "published" | "draft";
  search?: string;
  tags?: string[];
}

export interface CreateKnowledgeArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  categoryId: string;
  tags: string[];
  isPublic: boolean;
}

export interface UpdateKnowledgeArticleInput extends CreateKnowledgeArticleInput {
  isPublished: boolean;
}

export interface KnowledgeArticleFeedbackInput {
  wasHelpful: boolean;
  comment?: string;
}

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}
