// Report Contracts - 타입 정의 및 인터페이스

import {
  ReportType,
  ReportFormat,
  ReportFrequency,
  ReportRunStatus,
  ReportTriggerSource,
} from "@prisma/client";

export { ReportType, ReportFormat, ReportFrequency, ReportRunStatus, ReportTriggerSource };

// 날짜 범위
export interface DateRange {
  from: Date;
  to: Date;
}

export type DatePreset = "7d" | "30d" | "90d" | "this_week" | "this_month" | "last_week" | "last_month" | "custom";

// 보고서 필터
export interface ReportFilters {
  status?: string;
  categoryId?: string;
  assigneeId?: string;
  priority?: string;
  dateRange?: DateRange;
}

// 운영 보고서 데이터
export interface OperationalReportData {
  period: DateRange;
  summary: {
    totalActions: number;
    uniqueActors: number;
    actionsByType: Record<string, number>;
    actionsByResource: Record<string, number>;
  };
  agentActivities: AgentActivitySummary[];
  dailyStats: DailyStat[];
}

export interface AgentActivitySummary {
  agentId: string;
  agentName: string;
  agentEmail: string;
  totalActions: number;
  actionsByType: Record<string, number>;
  lastActivityAt: Date;
}

export interface DailyStat {
  date: string;
  totalActions: number;
  uniqueActors: number;
}

// 고객 보고서 데이터
export interface CustomerReportData {
  period: DateRange;
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    totalTickets: number;
    resolvedTickets: number;
    averageResponseTime: number;
    averageResolutionTime: number;
  };
  customers: CustomerSummary[];
}

export interface CustomerSummary {
  customerId: string;
  customerName: string;
  customerEmail: string;
  ticketCount: number;
  resolvedTickets: number;
  averageResponseTime: number;
  lastTicketAt: Date | null;
  tickets: TicketSummary[];
}

export interface TicketSummary {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  resolvedAt: Date | null;
  responseTime: number | null;
  resolutionTime: number | null;
}

// 생성된 보고서 결과
export interface GeneratedReportResult {
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

// 보고서 생성 요청
export interface CreateReportRequest {
  reportType: ReportType;
  format: ReportFormat;
  period: DateRange;
  filters?: ReportFilters;
}

// 스케줄 설정
export interface ReportScheduleConfig {
  name: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
  hour: number;
  minute: number;
  formats: ReportFormat[];
  recipients: string[];
  filters?: ReportFilters;
}

// 기간 키 생성 (주간/월간 구분용)
export function generatePeriodKey(period: DateRange, frequency: ReportFrequency): string {
  const date = period.from;
  if (frequency === "WEEKLY") {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return `W-${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
  }
  return `M-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
