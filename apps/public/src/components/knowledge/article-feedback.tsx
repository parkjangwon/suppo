"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { Button } from "@crinity/ui/components/ui/button";
import { usePublicCopy } from "@crinity/shared/i18n/public-context";

interface ArticleFeedbackProps {
  articleId: string;
}

export function ArticleFeedback({ articleId }: ArticleFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const copy = usePublicCopy();

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
        {copy.knowledgeFeedbackThanks}
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
        {copy.knowledgeFeedbackHelpful}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => handleFeedback(false)}
      >
        <ThumbsDown className="h-4 w-4 mr-2" />
        {copy.knowledgeFeedbackNotHelpful}
      </Button>
    </div>
  );
}
