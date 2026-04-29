"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Star, MessageSquare } from "lucide-react";

interface CSATData {
  id: string;
  rating: number;
  comment: string | null;
  submittedAt: string;
}

interface CSATTabProps {
  ticketId: string;
}

export function CSATTab({ ticketId }: CSATTabProps) {
  const [csat, setCsat] = useState<CSATData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCSAT() {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/csat`);
        if (response.ok) {
          const data = await response.json();
          setCsat(data);
        }
      } catch (error) {
        console.error("Failed to fetch CSAT:", error);
      } finally {
        setIsLoading(false);
      }
    }
    void fetchCSAT();
  }, [ticketId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (!csat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">고객 만족도</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            아직 만족도 조사 응답이 없습니다.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            티켓이 해결된 후 고객에게 설문 링크가 발송됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">고객 만족도</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <div
              key={value}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${value <= csat.rating
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }
              `}
            >
              <Star className={`h-5 w-5 ${value <= csat.rating ? "fill-current" : ""}`} />
            </div>
          ))}
        </div>
        <div className="text-center">
          <span className="text-2xl font-bold">{csat.rating}</span>
          <span className="text-muted-foreground"> / 5</span>
        </div>
        {csat.comment && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="text-sm">{csat.comment}</div>
            </div>
          </div>
        )}
        <div className="text-center text-sm text-muted-foreground">
          응답일: {new Date(csat.submittedAt).toLocaleDateString("ko-KR")}
        </div>
      </CardContent>
    </Card>
  );
}
