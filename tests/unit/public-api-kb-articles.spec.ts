import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, mockAuthenticatePublicApiKey } = vi.hoisted(() => ({
  prismaMock: {
    knowledgeArticle: {
      create: vi.fn(),
    },
    knowledgeCategory: {
      findFirst: vi.fn(),
    },
  },
  mockAuthenticatePublicApiKey: vi.fn(),
}));

vi.mock("@suppo/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/public-api/auth", () => ({
  authenticatePublicApiKey: mockAuthenticatePublicApiKey,
  hasPublicApiScope: vi.fn((apiKey: unknown, scope: string) => {
    const key = apiKey as { scopes: string[] };
    return key.scopes.includes(scope);
  }),
}));

import { POST } from "@/app/api/public/kb/articles/route";

const authedKey = { id: "key-1", createdById: "agent-1", scopes: ["kb:write"] };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/public/kb/articles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/public/kb/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatePublicApiKey.mockResolvedValue(authedKey);
  });

  it("returns 401 when api key is missing", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue(null);

    const res = await POST(makeRequest({ title: "T", content: "C" }));

    expect(res.status).toBe(401);
  });

  it("returns 403 when api key lacks kb:write scope", async () => {
    mockAuthenticatePublicApiKey.mockResolvedValue({
      ...authedKey,
      scopes: ["tickets:read"],
    });

    const res = await POST(makeRequest({ title: "T", content: "C" }));

    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeRequest({ content: "C" }));

    expect(res.status).toBe(400);
  });

  it("returns 422 when no categoryId is provided and no active category exists", async () => {
    prismaMock.knowledgeCategory.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ title: "Test", content: "Content" }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toMatch(/No knowledge base category available/);
    expect(prismaMock.knowledgeArticle.create).not.toHaveBeenCalled();
  });

  it("uses first active category when no categoryId provided and category exists", async () => {
    prismaMock.knowledgeCategory.findFirst.mockResolvedValue({ id: "cat-1" });
    prismaMock.knowledgeArticle.create.mockResolvedValue({
      id: "art-1",
      title: "Test",
      slug: "test-123",
      content: "Content",
      createdAt: new Date("2026-01-01"),
    });

    const res = await POST(makeRequest({ title: "Test", content: "Content" }));

    expect(res.status).toBe(201);
    expect(prismaMock.knowledgeArticle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: "cat-1",
          authorId: "agent-1",
          isPublished: false,
          isPublic: false,
        }),
      })
    );
  });

  it("uses provided categoryId without querying for default", async () => {
    prismaMock.knowledgeArticle.create.mockResolvedValue({
      id: "art-2",
      title: "Test",
      slug: "test-456",
      content: "Content",
      createdAt: new Date("2026-01-01"),
    });

    const res = await POST(
      makeRequest({ title: "Test", content: "Content", categoryId: "cat-explicit" })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.knowledgeCategory.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.knowledgeArticle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoryId: "cat-explicit" }),
      })
    );
  });
});
