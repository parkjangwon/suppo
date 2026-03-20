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
import { Trophy, FileText, Eye, ThumbsUp, TrendingUp, User } from "lucide-react";

export const metadata: Metadata = {
  title: "기여자 통계 | Crinity",
};

export default async function ContributorsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const articles = await prisma.knowledgeArticle.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      feedback: {
        select: {
          wasHelpful: true,
        },
      },
    },
  });

  const contributorMap = new Map();

  articles.forEach((article) => {
    const authorId = article.authorId;
    if (!contributorMap.has(authorId)) {
      contributorMap.set(authorId, {
        id: authorId,
        name: article.author.name,
        email: article.author.email,
        totalArticles: 0,
        publishedArticles: 0,
        totalViews: 0,
        helpfulFeedback: 0,
        totalFeedback: 0,
      });
    }

    const contributor = contributorMap.get(authorId);
    contributor.totalArticles += 1;
    if (article.isPublished) {
      contributor.publishedArticles += 1;
    }
    contributor.totalViews += article.viewCount;
    
    article.feedback.forEach((feedback) => {
      contributor.totalFeedback += 1;
      if (feedback.wasHelpful) {
        contributor.helpfulFeedback += 1;
      }
    });
  });

  const contributorStats = Array.from(contributorMap.values())
    .map((contributor) => ({
      ...contributor,
      helpfulRate:
        contributor.totalFeedback > 0
          ? (contributor.helpfulFeedback / contributor.totalFeedback) * 100
          : 0,
    }))
    .sort((a, b) => b.totalArticles - a.totalArticles);

  const totalArticles = articles.length;
  const publishedArticles = articles.filter((a) => a.isPublished).length;
  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);
  const totalFeedback = articles.reduce(
    (sum, a) => sum + a.feedback.length,
    0
  );
  const helpfulFeedback = articles.reduce(
    (sum, a) => sum + a.feedback.filter((f) => f.wasHelpful).length,
    0
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentArticles = await prisma.knowledgeArticle.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      author: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">지식 기여자 통계</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              전체 문서
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-500">
              총 조회수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {totalViews.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              문서당 평균 {totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0}회
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              피드백
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{totalFeedback}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              도움됨: {helpfulFeedback} (
              {totalFeedback > 0 ? Math.round((helpfulFeedback / totalFeedback) * 100) : 0}
              %)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              활성 기여자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{contributorStats.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              지식 문서를 작성한 상담원
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            기여자 순위
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contributorStats.length === 0 ? (
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
                  <TableHead className="text-center">만족도</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributorStats.map((contributor, index) => (
                  <TableRow key={contributor.id}>
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
                          <p className="font-medium">{contributor.name}</p>
                          <p className="text-xs text-gray-500">{contributor.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {contributor.totalArticles}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {contributor.publishedArticles}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {contributor.totalViews.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {contributor.helpfulFeedback > 0 ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          {contributor.helpfulFeedback}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {contributor.totalFeedback > 0 ? (
                        <span
                          className={`font-medium ${
                            contributor.helpfulRate >= 80
                              ? "text-green-600"
                              : contributor.helpfulRate >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {contributor.helpfulRate.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
