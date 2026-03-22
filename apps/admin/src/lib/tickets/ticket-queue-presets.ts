export interface TicketQueueFilter {
  queue?: "today";
  priority?: string;
  assigneeId?: string;
  customerSegment?: "vip";
  slaState?: "warning" | "breached";
}

export interface TicketQueuePreset {
  key: string;
  label: string;
  description: string;
  filter: TicketQueueFilter;
}

export function getTicketQueuePresets(currentAgentId?: string | null): TicketQueuePreset[] {
  return [
    {
      key: "today",
      label: "오늘 처리",
      description: "오늘 생성된 진행 대상 티켓을 빠르게 확인합니다.",
      filter: { queue: "today" },
    },
    {
      key: "urgent",
      label: "긴급",
      description: "가장 높은 우선순위의 티켓만 모아봅니다.",
      filter: { priority: "URGENT" },
    },
    {
      key: "vip",
      label: "VIP",
      description: "반복/중요 고객군에 속한 티켓을 우선 확인합니다.",
      filter: { customerSegment: "vip" },
    },
    {
      key: "mine",
      label: "내 담당",
      description: "현재 로그인한 상담원에게 배정된 티켓입니다.",
      filter: currentAgentId ? { assigneeId: currentAgentId } : {},
    },
    {
      key: "sla-warning",
      label: "SLA 임박",
      description: "SLA 경고가 발생한 티켓을 빠르게 확인합니다.",
      filter: { slaState: "warning" },
    },
  ];
}
