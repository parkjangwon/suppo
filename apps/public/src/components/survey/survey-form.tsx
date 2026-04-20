"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Button } from "@suppo/ui/components/ui/button";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import { Label } from "@suppo/ui/components/ui/label";
import { toast } from "sonner";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
}

interface SurveyFormProps {
  ticket: Ticket;
}

export function SurveyForm({ ticket }: SurveyFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="pt-8 text-center space-y-4">
          <div className="text-6xl">🙏</div>
          <h1 className="text-2xl font-bold">감사합니다!</h1>
          <p className="text-muted-foreground">
            소중한 의견을 보내주셔서 감사합니다.
            <br />
            지속적인 서비스 개선에 활용하겠습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("평점을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/survey/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || null }),
      });

      if (!response.ok) {
        throw new Error();
      }

      setIsSubmitted(true);
    } catch {
      toast.error("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          고객 만족도 조사
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center mt-2">
          티켓 해결에 대한 만족도를 평가해주세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="font-medium">{ticket.subject}</div>
          <div className="text-sm text-muted-foreground">
            티켓 번호: {ticket.ticketNumber}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-medium">
            이 티켓 해결에 얼마나 만족하셨나요?
            <span className="text-destructive">*</span>
          </Label>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`
                  flex-1 aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all
                  ${rating === value
                    ? "border-primary bg-primary text-primary-foreground scale-105"
                    : "border-muted hover:border-primary hover:bg-primary/5"
                  }
                `}
              >
                <span className="text-2xl">
                  {value === 1 && "😞"}
                  {value === 2 && "😐"}
                  {value === 3 && "🙂"}
                  {value === 4 && "😊"}
                  {value === 5 && "😄"}
                </span>
                <span className="text-sm font-medium">{value}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>매우 불만족</span>
            <span>매우 만족</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment">추가 의견 (선택)</Label>
          <Textarea
            id="comment"
            placeholder="개선할 점이 있으면 알려주세요."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full"
        >
          {isSubmitting ? "제출 중..." : "제출하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
