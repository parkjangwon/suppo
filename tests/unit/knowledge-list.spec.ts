import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("@/components/admin/category-manager", () => ({
  CategoryManager: () => React.createElement("div", null, "category-manager"),
}));

import { KnowledgeList } from "@/components/admin/knowledge-list";

const baseArticle = {
  id: "article-1",
  title: "문서 제목",
  excerpt: "요약",
  slug: "article-slug",
  categoryId: "cat-1",
  category: { name: "카테고리" },
  author: { name: "작성자" },
  authorId: "author-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  viewCount: 10,
  isPublished: true,
  isPublic: true,
};

describe("KnowledgeList public link visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a public link only for published public articles", () => {
    const markup = renderToStaticMarkup(
      React.createElement(KnowledgeList, {
        articles: [baseArticle],
        categories: [{ id: "cat-1", name: "카테고리" }],
        currentUserId: "author-1",
        isAdmin: true,
        publicBaseUrl: "https://helpdesk.example.com",
      })
    );

    expect(markup).toContain("공개 링크");
    expect(markup).toContain("https://helpdesk.example.com/knowledge/article-slug");
  });

  it("does not show a public link for draft or internal-only articles", () => {
    const markup = renderToStaticMarkup(
      React.createElement(KnowledgeList, {
        articles: [
          { ...baseArticle, id: "draft", slug: "draft-article", isPublished: false },
          { ...baseArticle, id: "internal", slug: "internal-article", isPublic: false },
        ],
        categories: [{ id: "cat-1", name: "카테고리" }],
        currentUserId: "author-1",
        isAdmin: true,
        publicBaseUrl: "https://helpdesk.example.com",
      })
    );

    expect(markup).not.toContain("https://helpdesk.example.com/knowledge/draft-article");
    expect(markup).not.toContain("https://helpdesk.example.com/knowledge/internal-article");
    expect(markup).toContain("공개 안 됨");
  });
});
