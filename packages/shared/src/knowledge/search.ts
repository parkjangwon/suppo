import { prisma } from "@crinity/db";

export interface ArticleSearchResult {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  tags: string[];
  matchCount: number;
}

/**
 * 주어진 쿼리와 관련된 지식 문서를 검색합니다 (RAG-lite).
 * SQLite 제약으로 인해 키워드 기반 다중 LIKE 검색 + 매칭 카운트 랭킹을 사용합니다.
 */
export async function searchRelevantArticles(
  query: string,
  options: {
    isPublic?: boolean;
    limit?: number;
  } = {}
): Promise<ArticleSearchResult[]> {
  const { isPublic, limit = 3 } = options;

  if (!query || query.trim().length < 2) {
    return [];
  }

  // 키워드 추출 (2자 이상, 최대 10개)
  const keywords = query
    .split(/\s+/)
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .slice(0, 10);

  if (keywords.length === 0) {
    return [];
  }

  const where: Record<string, unknown> = {
    isPublished: true,
  };

  if (isPublic !== undefined) {
    where.isPublic = isPublic;
  }

  // 가장 넓은 범위로 후보 문서 가져오기
  const allArticles = await prisma.knowledgeArticle.findMany({
    where: {
      ...where,
      OR: keywords.map((keyword) => ({
        OR: [
          { title: { contains: keyword } },
          { excerpt: { contains: keyword } },
          { content: { contains: keyword } },
        ],
      })),
    },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      tags: true,
    },
    take: 20, // 후보군 확보 후 매칭 카운트로 재랭킹
  });

  // 각 문서에 대해 매칭된 키워드 수 계산
  const scored = allArticles.map((article) => {
    const searchText = [
      article.title,
      article.excerpt ?? "",
      article.content,
      ...(article.tags as string[]),
    ]
      .join(" ")
      .toLowerCase();

    const matchCount = keywords.filter((kw) =>
      searchText.includes(kw.toLowerCase())
    ).length;

    return {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      tags: article.tags as string[],
      matchCount,
    };
  });

  // 매칭 카운트 기준 내림차순 정렬, 상위 N개 반환
  return scored
    .filter((a) => a.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit);
}
