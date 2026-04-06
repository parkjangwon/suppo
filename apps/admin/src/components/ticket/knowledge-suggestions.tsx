"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Lightbulb, ExternalLink, BookOpen } from "lucide-react";

interface KnowledgeSuggestionsProps {
  subject: string;
  description: string;
}

interface SuggestedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  categoryName: string;
}

export function KnowledgeSuggestions({ subject, description }: KnowledgeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchKnowledge = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/knowledge/search?q=${encodeURIComponent(query)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.articles || []);
        setHasSearched(true);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const combinedText = `${subject} ${description}`.trim();
    
    const timeoutId = setTimeout(() => {
      if (combinedText.length >= 5) {
        searchKnowledge(combinedText);
      } else {
        setSuggestions([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [subject, description, searchKnowledge]);

  if (!hasSearched || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
          <Lightbulb className="h-4 w-4" />
          먼저 확인해 보세요
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-blue-600 mb-3">
          비슷한 내용의 도움말을 찾았습니다. 티켓을 생성하기 전에 먼저 확인해 보세요.
        </p>
        <div className="space-y-2">
          {suggestions.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge/${article.slug}`}
              target="_blank"
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm text-gray-900 group-hover:text-blue-700 line-clamp-1">
                    {article.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {article.excerpt && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {article.excerpt}
                  </p>
                )}
                <Badge variant="secondary" className="mt-2 text-xs">
                  {article.categoryName}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-3 pt-3 border-t border-blue-100">
          원하는 답변을 찾지 못하셨나요? 아래에서 티켓을 계속 생성하실 수 있습니다.
        </p>
      </CardContent>
    </Card>
  );
}
