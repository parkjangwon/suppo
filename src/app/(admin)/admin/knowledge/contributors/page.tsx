import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  FileText,
  Eye,
  ThumbsUp,
  TrendingUp,
  User,
  TicketCheck,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getContributorImpactStats, getKnowledgeROIOverview } from "@/lib/knowledge/analytics";
import { estimateTicketDeflection } from "@/lib/knowledge/deflection";

export const metadata: Metadata = {
  title: "기여자 통계 | Crinity",
};

export default async function ContributorsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const [impactStats, roiOverview, deflection] = await Promise.all([
    getContributorImpactStats(),
    getKnowledgeROIOverview(),
    estimateTicketDeflection(30),
  ]);

  // 기존 통계도 병행 수집
  const articles = await prisma.knowledgeArticle.findMany({
    include: {
      author: { select: { id: true, name: true, email: true } },
      feedback: { select: { wasHelpful: true } },
    },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentArticles = await prisma.knowledgeArticle.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      id: true,
      title: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totalArticles = articles.length;
  const publishedArticles = articles.filter((a) => a.isPublished).length;
  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);

  // 기여자별 원본 통계 (이메일 포함용)
  const contributorEmailMap = new Map<string, string>();
  const publishedMap = new Map<string, number>();
  const viewsMap = new Map<string, number>();

  articles.forEach((article) => {
    const aid = article.authorId;
    if (!contributorEmailMap.has(aid)) {
      contributorEmailMap.set(aid, article.author.email);
      publishedMap.set(aid, 0);
      viewsMap.set(aid, 0);
    }
    if (article.isPublished) {
      publishedMap.set(aid, (publishedMap.get(aid) ?? 0) + 1);
    }
    viewsMap.set(aid, (viewsMap.get(aid) ?? 0) + article.viewCount);
  });

  // 영향력 점수 기준 정렬
  const sortedStats = [...impactStats].sort(
    (a, b) => b.effectivenessScore - a.effectivenessScore
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">지식 기여자 통계</h1>

      {/* 기본 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">전체 문서</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalArticles}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              게시됨: {publishedArticles} / 초안: {totalArticles - publishedArticles}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">총 조회수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{totalViews.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              문서당 평균 {totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0}회
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">
                {roiOverview.totalHelpfulFeedback + roiOverview.totalUnhelpfulFeedback}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              도움됨: {roiOverview.totalHelpfulFeedback} (
              {roiOverview.totalHelpfulFeedback + roiOverview.totalUnhelpfulFeedback > 0
                ? Math.round(
                    (roiOverview.totalHelpfulFeedback /
                      (roiOverview.totalHelpfulFeedback + roiOverview.totalUnhelpfulFeedback)) *
                      100
                  )
                : 0}
              %)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">활성 기여자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{sortedStats.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">지식 문서를 작성한 상담원</p>
          </CardContent>
        </Card>
      </div>

      {/* 비즈니스 임팩트 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <TicketCheck className="h-4 w-4" />
              티켓 해결 기여
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {roiOverview.ticketLinksOnResolvedTickets}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              해결된 티켓에 지식 문서가 기여한 수
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              예상 티켓 전환 방지 (30일)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {deflection.estimatedDeflections}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              긍정 피드백 {deflection.positiveKBFeedback}건 기반 추정
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              총 티켓 연결
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {roiOverview.totalTicketLinks}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              AI 추천 + 상담원 삽입 + 수동 연결
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 기여자 순위 테이블 (영향력 점수 기준) */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            기여자 순위
            <span className="text-sm font-normal text-muted-foreground ml-2">
              — 영향력 점수 기준 정렬
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStats.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              아직 지식 문서를 작성한 기여자가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">순위</TableHead>
                  <TableHead>기여자</TableHead>
                  <TableHead className="text-center">문서 수</TableHead>
                  <TableHead className="text-center">게시됨</TableHead>
                  <TableHead className="text-center">총 조회수</TableHead>
                  <TableHead className="text-center">도움됨</TableHead>
                  <TableHead className="text-center">티켓 기여</TableHead>
                  <TableHead className="text-center">영향력 점수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.map((contributor, index) => (
                  <TableRow key={contributor.agentId}>
                    <TableCell>
                      {index === 0 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                          1
                        </span>
                      )}
                      {index === 1 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                          2
                        </span>
                      )}
                      {index === 2 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                          3
                        </span>
                      )}
                      {index > 2 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 text-gray-500 text-sm">
                          {index + 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{contributor.agentName}</p>
                          <p className="text-xs text-gray-500">
                            {contributorEmailMap.get(contributor.agentId) ?? ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {contributor.articlesAuthored}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {publishedMap.get(contributor.agentId) ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(viewsMap.get(contributor.agentId) ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {contributor.totalHelpfulVotes > 0 ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          {contributor.totalHelpfulVotes}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {contributor.articlesLinkedToResolvedTickets > 0 ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {contributor.articlesLinkedToResolvedTickets}건
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-bold text-base ${
                          contributor.effectivenessScore >= 50
                            ? "text-green-600"
                            : contributor.effectivenessScore >= 20
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      >
                        {contributor.effectivenessScore}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동 (30일)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              최근 30일간 새로 작성된 문서가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{article.title}</p>
                    <p className="text-xs text-gray-500">
                      작성자: {article.author.name} ·{" "}
                      {new Date(article.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
