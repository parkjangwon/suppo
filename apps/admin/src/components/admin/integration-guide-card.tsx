"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";

const CREATE_TICKET_EXAMPLE = `curl -X POST https://YOUR_ADMIN_DOMAIN/api/public/tickets \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: crn_live_xxxxxxxxxxxxxxxxx" \\
  -d '{
    "customerName": "홍길동",
    "customerEmail": "hong@example.com",
    "requestTypeId": "REQUEST_TYPE_ID",
    "priority": "MEDIUM",
    "subject": "외부 시스템에서 생성한 문의",
    "description": "주문 시스템 장애 접수"
  }'`;

const WEBHOOK_EXAMPLE = `POST /your/webhook-endpoint
Content-Type: application/json
x-crinity-signature: <sha256 hmac>

{
  "event": "ticket.created",
  "occurredAt": "2026-03-29T10:00:00.000Z",
  "data": {
    "source": "public-form",
    "ticketId": "ticket_123",
    "ticketNumber": "CRN-2026-000123"
  }
}`;

export function IntegrationGuideCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>연동 빠른 가이드</CardTitle>
        <p className="text-sm text-muted-foreground">
          외부 시스템은 공개 API 키로 티켓을 만들고, 우리 시스템은 webhook으로 이벤트를 외부에 알려줍니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="font-medium">공개 API 사용 순서</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>연동 설정에서 API 키를 발급합니다.</li>
            <li>외부 시스템에서 `x-api-key` 헤더로 `/api/public/tickets`를 호출합니다.</li>
            <li>생성된 티켓 ID로 상세 조회나 상태 변경을 이어서 수행합니다.</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg border bg-muted/20 p-3 text-xs leading-5">
            <code>{CREATE_TICKET_EXAMPLE}</code>
          </pre>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Webhook 사용 순서</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>외부 수신 URL과 이벤트를 등록합니다.</li>
            <li>필요하면 시크릿을 넣어 `x-crinity-signature` 서명을 검증합니다.</li>
            <li>`테스트 발송`으로 연결을 먼저 확인한 뒤 운영 이벤트를 받습니다.</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg border bg-muted/20 p-3 text-xs leading-5">
            <code>{WEBHOOK_EXAMPLE}</code>
          </pre>
        </div>

        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          현재 공개 API는 티켓 생성/조회/수정 중심이며, webhook 이벤트는 `ticket.created`, `ticket.updated`,
          `ticket.commented`를 지원합니다.
        </div>
      </CardContent>
    </Card>
  );
}
