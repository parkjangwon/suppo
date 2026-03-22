"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crinity/ui/components/ui/tabs";
import { ArrowRight, Globe2, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import {
  HELPDESK_CAPABILITY_DEFINITIONS,
  type HelpdeskCapabilityDefinition,
} from "@/lib/helpdesk/capability-definitions";
import { getTicketQueuePresets } from "@/lib/tickets/ticket-queue-presets";
import { SLAPolicyManager } from "@/components/admin/sla-policy-manager";
import { AutomationRuleManager } from "@/components/admin/automation-rule-manager";

interface HelpdeskOperationsCenterProps {
  currentAgentId?: string;
  agents: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}

const STATUS_LABELS: Record<HelpdeskCapabilityDefinition["status"], string> = {
  live: "운영중",
  expanding: "확장중",
  foundation: "토대 구축",
};

export function HelpdeskOperationsCenter({
  currentAgentId,
  agents,
  teams,
}: HelpdeskOperationsCenterProps) {
  const queuePresets = useMemo(() => getTicketQueuePresets(currentAgentId), [currentAgentId]);

  return (
    <Tabs defaultValue="capabilities" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="capabilities">기능 지도</TabsTrigger>
        <TabsTrigger value="sla">SLA 정책</TabsTrigger>
        <TabsTrigger value="automation">자동화 규칙</TabsTrigger>
        <TabsTrigger value="queues">운영 큐</TabsTrigger>
      </TabsList>

      <TabsContent value="capabilities" className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {HELPDESK_CAPABILITY_DEFINITIONS.map((definition) => (
            <Card key={definition.key} className="h-full">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{definition.title}</CardTitle>
                  <Badge variant="outline">{STATUS_LABELS[definition.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{definition.summary}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {definition.concreteFeatures.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                {definition.supportedLocales ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe2 className="h-4 w-4" />
                    {definition.supportedLocales.join(" / ")}
                  </div>
                ) : null}
                {definition.href ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={definition.href}>
                      관련 화면 열기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Workflow className="h-4 w-4" />
                운영 원칙
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>모든 정책은 관리자만 수정하고, 상담원은 실행 결과만 빠르게 소비하도록 설계합니다.</p>
              <p>SLA와 자동화는 티켓 생성부터 해결까지의 흐름을 자동으로 뒷받침해야 합니다.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                권한 전략
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>현재는 관리자/상담원 권한을 유지하되, 팀장/읽기전용 확장을 위한 운영 기준을 함께 문서화합니다.</p>
              <p>관리자 전용 화면은 숨김과 설명형 접근 차단을 동시에 적용합니다.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                AI 운영 기준
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>AI는 상담원 대체가 아니라 자동 분류, 자동 요약, 자동 라우팅 보조에 집중합니다.</p>
              <p>고객 답변 초안 생성과 지식 연결은 항상 운영자 검토를 거치게 유지합니다.</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="sla">
        <SLAPolicyManager />
      </TabsContent>

      <TabsContent value="automation">
        <AutomationRuleManager agents={agents} teams={teams} />
      </TabsContent>

      <TabsContent value="queues" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {queuePresets.map((preset) => (
            <Card key={preset.key}>
              <CardHeader>
                <CardTitle className="text-base">{preset.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{preset.description}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildQueueHref(preset.filter)}>
                    이 큐 열기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function buildQueueHref(filter: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/admin/tickets?${query}` : "/admin/tickets";
}
