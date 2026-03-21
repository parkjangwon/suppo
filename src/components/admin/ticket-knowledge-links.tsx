"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, X, Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ArticleLink {
  id: string;
  linkType: string;
  createdAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
  };
  agent: {
    id: string;
    name: string;
  };
}

interface ArticleSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

const linkTypeLabel: Record<string, string> = {
  AI_SUGGESTION: "AI 추천",
  AGENT_INSERT: "상담원 삽입",
  MANUAL_LINK: "수동 연결",
};

const linkTypeVariant: Record<string, "default" | "secondary" | "outline"> = {
  AI_SUGGESTION: "default",
  AGENT_INSERT: "secondary",
  MANUAL_LINK: "outline",
};

interface TicketKnowledgeLinksProps {
  ticketId: string;
  canEdit?: boolean;
}

export function TicketKnowledgeLinks({ ticketId, canEdit = true }: TicketKnowledgeLinksProps) {
  const [links, setLinks] = useState<ArticleLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ArticleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/knowledge-links`);
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links);
      }
    } catch {
      // 조용히 실패
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/knowledge/search?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.articles || []);
      }
    } catch {
      toast.error("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddLink = async (articleId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/knowledge-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, linkType: "MANUAL_LINK" }),
      });

      if (response.ok) {
        toast.success("문서가 연결되었습니다.");
        setIsAddingMode(false);
        setSearchQuery("");
        setSearchResults([]);
        await fetchLinks();
      } else if (response.status === 409) {
        toast.info("이미 연결된 문서입니다.");
      }
    } catch {
      toast.error("연결 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveLink = async (articleId: string) => {
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/knowledge-links?articleId=${encodeURIComponent(articleId)}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("연결이 해제되었습니다.");
        await fetchLinks();
      }
    } catch {
      toast.error("연결 해제 중 오류가 발생했습니다.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            연결된 지식 문서
            {links.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {links.length}
              </Badge>
            )}
          </CardTitle>
          {canEdit && !isAddingMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMode(true)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              문서 연결
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 && !isAddingMode ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            연결된 지식 문서가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-start justify-between gap-2 p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {link.article.title}
                    </span>
                    <Badge
                      variant={linkTypeVariant[link.linkType] ?? "outline"}
                      className="text-xs flex-shrink-0"
                    >
                      {linkTypeLabel[link.linkType] ?? link.linkType}
                    </Badge>
                  </div>
                  {link.article.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {link.article.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {link.agent.name}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLink(link.article.id)}
                    className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isAddingMode && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="지식 문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={isSearching || searchQuery.length < 2}
                className="h-8"
              >
                {isSearching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingMode(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="h-8 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleAddLink(article.id)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <Plus className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
