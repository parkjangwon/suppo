import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@crinity/db";
import { SurveyForm } from "@/components/survey/survey-form";

export const metadata: Metadata = {
  title: "고객 만족도 조사 | Crinity",
  description: "티켓 해결에 대한 만족도를 평가해주세요.",
};

interface SurveyPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { token } = await params;

  // 토큰 유효성 검증: 티켓 번호 + 타임스탬프 + 서명
  // 간단히 티켓 ID를 토큰으로 사용 (실제로는 서명된 토큰 필요)
  const ticket = await prisma.ticket.findUnique({
    where: { id: token },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      customerName: true,
      customerEmail: true,
      status: true,
      resolvedAt: true,
      closedAt: true,
    },
  });

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 text-center space-y-4">
          <h1 className="text-2xl font-bold">설문을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground">
            링크가 만료되었거나 올바르지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  // 이미 제출된 설문 확인
  const existingSurvey = await prisma.customerSatisfaction.findUnique({
    where: { ticketId: ticket.id },
  });

  if (existingSurvey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 text-center space-y-4">
          <div className="text-6xl">✓</div>
          <h1 className="text-2xl font-bold">이미 제출하셨습니다</h1>
          <p className="text-muted-foreground">
            소중한 의견에 감사드립니다.
          </p>
        </div>
      </div>
    );
  }

  // 해결되지 않은 티켓
  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 text-center space-y-4">
          <h1 className="text-2xl font-bold">아직 해결되지 않은 티켓입니다</h1>
          <p className="text-muted-foreground">
            티켓이 해결된 후 설문이 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-10">
      <div className="max-w-md w-full mx-4">
        <SurveyForm ticket={ticket} />
      </div>
    </div>
  );
}
