// Analytics Contracts - Shared types for analytics features

export interface DateRange {
  from: Date;
  to: Date;
}

export type DatePreset = "7d" | "30d" | "90d" | "custom";

export interface AnalyticsFilters {
  from: Date;
  to: Date;
  preset: DatePreset;
}

// Agent Performance
export interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketsHandled: number;
  openTickets: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface AgentPerformanceResponse {
  agents: AgentPerformance[];
  summary: {
    totalTickets: number;
    avgFirstResponseMinutes: number | null;
    avgResolutionMinutes: number | null;
  };
}

// CSAT Trends
export interface CSATBucket {
  bucket: string; // YYYY-MM-DD or YYYY-MM
  avgRating: number;
  responseCount: number;
  positiveRate: number; // % of ratings >= 4
}

export interface CSATTrendResponse {
  trend: CSATBucket[];
  summary: {
    avgRating: number | null;
    totalResponses: number;
    positiveRate: number | null;
  };
}

// Category Frequency
export interface CategoryFrequency {
  categoryId: string | null;
  categoryName: string;
  ticketCount: number;
  sharePercent: number;
}

export interface CategoryFrequencyResponse {
  categories: CategoryFrequency[];
  totalTickets: number;
}

// Resolution Heatmap
export interface HeatmapCell {
  weekday: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  hour: number; // 0-23
  avgResolutionHours: number | null;
  sampleCount: number;
}

export interface ResolutionHeatmapResponse {
  cells: HeatmapCell[];
  weekdayLabels: string[];
  hourLabels: string[];
}

// Customer Repeat Inquiries
export type RepeatPatternType = "same-category" | "cross-category" | "mixed";

export interface RepeatInquiry {
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  ticketCount: number;
  distinctCategories: number;
  firstTicketAt: Date;
  lastTicketAt: Date;
  patternType: RepeatPatternType;
}

export interface RepeatInquiryResponse {
  customers: RepeatInquiry[];
  totalRepeatCustomers: number;
}

// VIP Customers
export type VIPReason = "high-volume" | "high-priority" | "long-term";

export interface VIPCustomer {
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  recentTickets: number; // Last 90 days
  lifetimeTickets: number;
  highPriorityTickets: number; // Last 90 days
  vipScore: number;
  vipReasons: VIPReason[];
}

export interface VIPCustomerResponse {
  customers: VIPCustomer[];
}

// Customer Insights (for detail page)
export interface CustomerStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionHours: number | null;
  avgCsat: number | null;
  csatResponses: number;
  lastTicketAt: Date | null;
}

export interface CustomerCategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  ticketCount: number;
}

export interface CustomerInsightsResponse {
  customer: {
    id: string;
    name: string;
    email: string;
    ticketCount: number;
    lastTicketAt: Date | null;
  };
  stats: CustomerStats;
  categoryBreakdown: CustomerCategoryBreakdown[];
  tickets: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: Date;
    resolvedAt: Date | null;
    csatRating: number | null;
  }>;
}

// Overview KPI
export interface OverviewKPI {
  totalTickets: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionHours: number | null;
  avgCsat: number | null;
  repeatCustomers: number;
  vipCustomers: number;
}

export interface OverviewResponse {
  kpi: OverviewKPI;
  csatTrend: CSATBucket[];
  categoryFrequency: CategoryFrequency[];
  resolutionHeatmap: ResolutionHeatmapResponse;
}
