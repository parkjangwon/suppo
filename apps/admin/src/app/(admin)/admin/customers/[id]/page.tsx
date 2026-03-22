"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Button } from "@crinity/ui/components/ui/button";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { Badge } from "@crinity/ui/components/ui/badge";
import { formatPhoneNumber } from "@crinity/shared/utils/phone-format";
import { CustomerInsightsPanel } from "@/components/admin/customer-insights-panel";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  ticketCount: number;
  memo: string | null;
  analysis: string | null;
  analyzedAt?: string | null;
  tickets: Ticket[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "열림", variant: "default" },
  IN_PROGRESS: { label: "진행중", variant: "secondary" },
  WAITING: { label: "대기중", variant: "outline" },
  RESOLVED: { label: "해결됨", variant: "outline" },
  CLOSED: { label: "닫힘", variant: "outline" },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [memo, setMemo] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/admin/customers/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("고객을 찾을 수 없습니다.");
          }
          throw new Error("고객 정보를 불러오는데 실패했습니다.");
        }
        const data = await res.json();
        setCustomer(data);
        setMemo(data.memo || "");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  const handleSaveMemo = async () => {
    setIsSavingMemo(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });

      if (!res.ok) throw new Error("메모 저장 실패");
      
      toast.success("메모가 저장되었습니다.");
      setCustomer(prev => prev ? { ...prev, memo } : null);
    } catch (err) {
      toast.error("메모 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleReAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}/analyze`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("AI 분석 실패");
      
      const data = await res.json();
      toast.success("AI 분석이 완료되었습니다.");
      setCustomer(prev => prev ? { ...prev, analysis: data.analysis } : null);
    } catch (err) {
      toast.error("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[400px]">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center text-destructive">
            {error || "고객을 찾을 수 없습니다."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">고객 상세 정보</h1>
        <Button variant="outline" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">이름</div>
                <div className="font-medium">{customer.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">이메일</div>
                <div>
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              </div>
              {customer.phone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">전화번호</div>
                  <div>{formatPhoneNumber(customer.phone)}</div>
                </div>
              )}
              {customer.organization && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">소속</div>
                  <div>{customer.organization}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-muted-foreground">총 티켓 수</div>
                <div>{customer.ticketCount}개</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">관리자 메모</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="고객에 대한 메모를 입력하세요..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="min-h-[150px]"
              />
              <Button 
                onClick={handleSaveMemo} 
                disabled={isSavingMemo || memo === (customer.memo || "")}
                className="w-full"
              >
                {isSavingMemo ? "저장 중..." : "메모 저장"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">AI 고객 분석</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "분석 중..." : "AI 재분석"}
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {customer.analysis ? (
                <div className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-md">
                  {customer.analysis}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm bg-muted/20 rounded-md">
                  아직 AI 분석 결과가 없습니다. 재분석 버튼을 눌러 분석을 시작하세요.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">통계 인사이트</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerInsightsPanel customerId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">티켓 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="mb-3 text-sm font-medium">고객 360 타임라인</div>
                <div className="space-y-3">
                  <TimelineItem
                    title="고객 프로필"
                    description={`${customer.name} 고객이 ${customer.ticketCount}개의 티켓과 연결되어 있습니다.`}
                  />
                  {customer.memo ? (
                    <TimelineItem title="관리자 메모" description={customer.memo} />
                  ) : null}
                  {customer.analyzedAt ? (
                    <TimelineItem
                      title="AI 고객 분석"
                      description={`${new Date(customer.analyzedAt).toLocaleString("ko-KR")} 기준으로 고객 분석이 갱신되었습니다.`}
                    />
                  ) : null}
                  {customer.tickets.slice(0, 3).map((ticket) => (
                    <TimelineItem
                      key={ticket.id}
                      title={`최근 티켓 ${ticket.ticketNumber}`}
                      description={`${ticket.subject} · ${format(new Date(ticket.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}`}
                    />
                  ))}
                </div>
              </div>

              {customer.tickets.length > 0 ? (
                <div className="space-y-4">
                  {customer.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/tickets/${ticket.id}`}
                      className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{ticket.ticketNumber}</Badge>
                          <span className="font-medium">{ticket.subject}</span>
                        </div>
                        <Badge variant={statusMap[ticket.status]?.variant || "default"}>
                          {statusMap[ticket.status]?.label || ticket.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        생성일: {format(new Date(ticket.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 티켓이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
