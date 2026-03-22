import { prisma } from "@crinity/db";

export interface ArticleEffectivenessScore {
  articleId: string;
  title: string;
  authorId: string;
  authorName: string;
  helpfulVotes: number;
  unhelpfulVotes: number;
  ticketResolutionLinks: number;
  totalTicketLinks: number;
  viewCount: number;
  effectivenessScore: number;
}

export interface ContributorImpactStats {
  agentId: string;
  agentName: string;
  articlesAuthored: number;
  articlesLinkedToResolvedTickets: number;
  totalTicketLinks: number;
  totalHelpfulVotes: number;
  effectivenessScore: number;
}

/**
 * 기여자별 영향력 통계를 반환합니다.
 * agentId가 주어지면 해당 기여자만 반환합니다.
 */
export async function getContributorImpactStats(
  agentId?: string
): Promise<ContributorImpactStats[]> {
  const whereAgent = agentId ? { id: agentId } : {};

  const agents = await prisma.agent.findMany({
    where: {
      ...whereAgent,
      authoredKnowledge: { some: {} },
    },
    select: {
      id: true,
      name: true,
      authoredKnowledge: {
        select: {
          id: true,
          viewCount: true,
          feedback: {
            select: { wasHelpful: true },
          },
          ticketLinks: {
            select: {
              ticket: {
                select: { status: true },
              },
            },
          },
        },
      },
    },
  });

  return agents.map((agent) => {
    let totalHelpfulVotes = 0;
    let totalTicketLinks = 0;
    let articlesLinkedToResolvedTickets = 0;
    let totalViewCount = 0;

    for (const article of agent.authoredKnowledge) {
      const helpfulVotes = article.feedback.filter((f) => f.wasHelpful).length;
      totalHelpfulVotes += helpfulVotes;

      const resolvedLinks = article.ticketLinks.filter(
        (l) => l.ticket.status === "RESOLVED" || l.ticket.status === "CLOSED"
      ).length;
      totalTicketLinks += article.ticketLinks.length;

      if (resolvedLinks > 0) {
        articlesLinkedToResolvedTickets++;
      }

      totalViewCount += article.viewCount;
    }

    // 영향력 점수: helpfulVotes * 3 + ticketResolutionLinks * 5 + views * 0.01
    const effectivenessScore =
      totalHelpfulVotes * 3 +
      articlesLinkedToResolvedTickets * 5 +
      totalViewCount * 0.01;

    return {
      agentId: agent.id,
      agentName: agent.name,
      articlesAuthored: agent.authoredKnowledge.length,
      articlesLinkedToResolvedTickets,
      totalTicketLinks,
      totalHelpfulVotes,
      effectivenessScore: Math.round(effectivenessScore * 10) / 10,
    };
  });
}

/**
 * 지식 베이스 전체 ROI 개요를 반환합니다.
 */
export async function getKnowledgeROIOverview() {
  const [totalArticles, totalFeedback, totalLinks, resolvedLinks] =
    await Promise.all([
      prisma.knowledgeArticle.count({ where: { isPublished: true } }),
      prisma.knowledgeArticleFeedback.groupBy({
        by: ["wasHelpful"],
        _count: { _all: true },
      }),
      prisma.ticketKnowledgeLink.count(),
      prisma.ticketKnowledgeLink.count({
        where: {
          ticket: { status: { in: ["RESOLVED", "CLOSED"] } },
        },
      }),
    ]);

  const helpfulCount =
    totalFeedback.find((f) => f.wasHelpful)?._count._all ?? 0;
  const unhelpfulCount =
    totalFeedback.find((f) => !f.wasHelpful)?._count._all ?? 0;

  return {
    totalPublishedArticles: totalArticles,
    totalHelpfulFeedback: helpfulCount,
    totalUnhelpfulFeedback: unhelpfulCount,
    totalTicketLinks: totalLinks,
    ticketLinksOnResolvedTickets: resolvedLinks,
  };
}
