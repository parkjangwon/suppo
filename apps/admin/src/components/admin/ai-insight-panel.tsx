"use client";

import { useState } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { MarkdownContent } from "@crinity/shared/components/markdown-content";
import { Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

interface AiInsightPanelProps {
  title: string;
  fetchFn: () => Promise<string | null>;
  description?: string;
}

// result === null means AI is disabled (parent should prevent rendering, but null → null as safety net)
type State = "idle" | "loading" | "success" | "error";

export function AiInsightPanel({ title, fetchFn, description }: AiInsightPanelProps) {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setError(null);
    try {
      const text = await fetchFn();
      if (text === null) {
        // analysisEnabled = false — 부모가 렌더링을 막아야 하지만 방어적으로 error 처리
        setError("AI 분석 결과를 가져올 수 없습니다.");
        setState("error");
        return;
      }
      setResult(text);
      setState("success");
    } catch {
      setError("AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setState("error");
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {title}
          </CardTitle>
          {state === "success" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={run}
              className="gap-1 text-xs h-7"
            >
              <RefreshCw className="h-3 w-3" />
              다시 생성
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {state === "idle" && (
          <div className="space-y-2">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Button size="sm" onClick={run} className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI 분석
            </Button>
          </div>
        )}
        {state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            분석 중...
          </div>
        )}
        {state === "success" && result && (
          <MarkdownContent content={result} className="text-sm text-foreground" />
        )}
        {state === "error" && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={run} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              재시도
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
