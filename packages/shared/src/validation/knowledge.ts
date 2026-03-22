import { z } from "zod";

export const knowledgeCategorySchema = z.object({
  name: z.string().min(1, "카테고리 이름을 입력해주세요"),
  slug: z.string().min(1, "슬러그를 입력해주세요").regex(/^[a-z0-9-]+$/, "슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다"),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(200, "제목은 200자 이내로 입력해주세요"),
  slug: z.string().min(1, "슬러그를 입력해주세요").regex(/^[a-z0-9-]+$/, "슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다"),
  content: z.string().min(1, "내용을 입력해주세요"),
  excerpt: z.string().max(500, "요약은 500자 이내로 입력해주세요").optional(),
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
  isPublished: z.boolean().default(false),
});

export const createKnowledgeArticleSchema = knowledgeArticleSchema.omit({
  isPublished: true,
});

export const updateKnowledgeArticleSchema = knowledgeArticleSchema;

export const knowledgeArticleFeedbackSchema = z.object({
  wasHelpful: z.boolean(),
  comment: z.string().max(1000, "피드백은 1000자 이내로 입력해주세요").optional(),
});

export const knowledgeSearchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type KnowledgeCategoryInput = z.infer<typeof knowledgeCategorySchema>;
export type KnowledgeArticleInput = z.infer<typeof knowledgeArticleSchema>;
export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;
export type UpdateKnowledgeArticleInput = z.infer<typeof updateKnowledgeArticleSchema>;
export type KnowledgeArticleFeedbackInput = z.infer<typeof knowledgeArticleFeedbackSchema>;
export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;
