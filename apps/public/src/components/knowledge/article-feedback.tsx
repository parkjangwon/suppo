"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { Button } from "@crinity/ui/components/ui/button";

interface ArticleFeedbackProps {
  articleId: string;
}

export function ArticleFeedback({ articleId }: ArticleFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFeedback(wasHelpful: boolean) {
    if (submitted || loading) return;
    setLoading(true);

    try {
      await fetch(`/api/knowledge/${articleId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wasHelpful }),
      });
      setSubmitted(true);
    } catch {
      // 조용히 실패 — UX 방해 없이
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        피드백을 보내주셔서 감사합니다!
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => handleFeedback(true)}
      >
        <ThumbsUp className="h-4 w-4 mr-2" />
        도움이 되었어요
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => handleFeedback(false)}
      >
        <ThumbsDown className="h-4 w-4 mr-2" />
        도움이 필요해요
      </Button>
    </div>
  );
}
