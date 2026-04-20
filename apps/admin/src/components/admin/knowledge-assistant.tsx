"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@suppo/ui/components/ui/button";
import { Input } from "@suppo/ui/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Badge } from "@suppo/ui/components/ui/badge";
import { BookOpen, Search, Plus, X, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeAssistantProps {
  onInsertContent: (content: string) => void;
  ticketSubject?: string;
  ticketDescription?: string;
  ticketId?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  viewCount: number;
}

export function KnowledgeAssistant({
  onInsertContent,
  ticketSubject,
  ticketDescription,
  ticketId,
}: KnowledgeAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchArticles = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setArticles([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/knowledge/search?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
        setHasSearched(true);
      }
    } catch (error) {
      console.error("Failed to search knowledge:", error);
      toast.error("지식 검색 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-search based on ticket content when opened
  useEffect(() => {
    if (isOpen && ticketSubject && !query) {
      const initialQuery = ticketSubject;
      setQuery(initialQuery);
      searchArticles(initialQuery);
    }
  }, [isOpen, ticketSubject, query, searchArticles]);

  const handleInsert = async (article: Article) => {
    const content = `[${article.title}]\n\n${article.content}\n\n참고: ${article.category.name} 도움말`;
    onInsertContent(content);

    // 티켓-지식 링크 자동 생성 (AGENT_INSERT)
    if (ticketId) {
      try {
        await fetch(`/api/tickets/${ticketId}/knowledge-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: article.id, linkType: "AGENT_INSERT" }),
        });
      } catch {
        // 링크 생성 실패는 조용히 처리 (삽입 자체는 성공)
      }
    }

    toast.success("내용이 삽입되었습니다.");
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <BookOpen className="h-4 w-4" />
        지식 검색
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            지식 검색
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchArticles(query);
              }
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => searchArticles(query)}
            disabled={isLoading || query.length < 2}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {isLoading && (
          <p className="text-sm text-gray-500 text-center py-4">
            검색 중...
          </p>
        )}

        {!isLoading && hasSearched && articles.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            검색 결과가 없습니다.
          </p>
        )}

        {!isLoading && articles.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {articles.map((article) => (
              <div
                key={article.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                      {article.title}
                    </h4>
                    {article.excerpt && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {article.category.name}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        조회 {article.viewCount}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInsert(article)}
                    className="h-7 w-7 p-0 flex-shrink-0"
                    title="내용 삽입"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
