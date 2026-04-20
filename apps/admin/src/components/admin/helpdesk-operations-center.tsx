"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suppo/ui/components/ui/tabs";
import { ArrowRight } from "lucide-react";
import { getTicketQueuePresets } from "@/lib/tickets/ticket-queue-presets";
import type { TicketQueueFilter } from "@/lib/tickets/ticket-queue-presets";
import { SLAPolicyManager } from "@/components/admin/sla-policy-manager";
import { AutomationRuleManager } from "@/components/admin/automation-rule-manager";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface HelpdeskOperationsCenterProps {
  currentAgentId?: string;
  agents: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}

export function HelpdeskOperationsCenter({
  currentAgentId,
  agents,
  teams,
}: HelpdeskOperationsCenterProps) {
  const copy = useAdminCopy();
  const queuePresets = useMemo(() => getTicketQueuePresets(currentAgentId), [currentAgentId]);

  return (
    <Tabs defaultValue="sla" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title={copyText(copy, "helpdeskSlaTitle", "응답 목표")}
          description={copyText(copy, "helpdeskSlaDescription", "문의별 응답/해결 목표 시간을 정해 서비스 기준을 맞춥니다.")}
        />
        <SummaryCard
          title={copyText(copy, "helpdeskAutoTitle", "자동 처리")}
          description={copyText(copy, "helpdeskAutoDescription", "반복되는 분류, 우선순위 변경, 재배정을 규칙으로 자동화합니다.")}
        />
        <SummaryCard
          title={copyText(copy, "helpdeskShortcutsTitle", "작업 바로가기")}
          description={copyText(copy, "helpdeskShortcutsDescription", "상담원이 자주 보는 작업 목록을 빠르게 열 수 있게 준비합니다.")}
        />
      </div>

      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="sla">{copyText(copy, "helpdeskSlaTitle", "응답 목표")}</TabsTrigger>
        <TabsTrigger value="automation">{copyText(copy, "helpdeskAutoTitle", "자동 처리")}</TabsTrigger>
        <TabsTrigger value="queues">{copyText(copy, "helpdeskShortcutsTitle", "작업 바로가기")}</TabsTrigger>
      </TabsList>

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
                    {copyText(copy, "helpdeskOpenQueue", "이 큐 열기")}
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

function SummaryCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function buildQueueHref(filter: TicketQueueFilter) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/admin/tickets?${query}` : "/admin/tickets";
}
