export interface KPIData {
  period: string;
  totalTickets: number;
  resolvedTickets: number;
  averageResponseTime: number; // in minutes
  averageResolutionTime: number; // in minutes
  csatScore: number; // 0-5
  slaComplianceRate: number; // 0-100
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketsResolved: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  csatAverage: number;
  slaComplianceRate: number;
}

export function calculateAverageTime(times: number[]): number {
  if (times.length === 0) return 0;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

export function calculateSLACompliance(
  totalTickets: number,
  breachedTickets: number
): number {
  if (totalTickets === 0) return 100;
  return Math.round(((totalTickets - breachedTickets) / totalTickets) * 100);
}

export function calculateCSATScore(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
}

export interface ExecutiveSummary {
  period: string;
  overview: {
    totalTickets: number;
    growthRate: number; // percentage
    resolutionRate: number;
  };
  performance: {
    topAgents: AgentPerformance[];
    bottomAgents: AgentPerformance[];
  };
  trends: {
    ticketVolume: number[]; // daily counts
    csatTrend: number[]; // daily averages
  };
}

export function generateExecutiveSummary(
  kpiData: KPIData[],
  agentData: AgentPerformance[]
): ExecutiveSummary {
  const current = kpiData[kpiData.length - 1];
  const previous = kpiData[kpiData.length - 2];
  
  const growthRate = previous 
    ? ((current.totalTickets - previous.totalTickets) / previous.totalTickets) * 100
    : 0;
  
  const sortedAgents = [...agentData].sort((a, b) => 
    b.ticketsResolved - a.ticketsResolved
  );
  
  return {
    period: current.period,
    overview: {
      totalTickets: current.totalTickets,
      growthRate: Math.round(growthRate * 10) / 10,
      resolutionRate: current.totalTickets > 0
        ? Math.round((current.resolvedTickets / current.totalTickets) * 100)
        : 0
    },
    performance: {
      topAgents: sortedAgents.slice(0, 3),
      bottomAgents: sortedAgents.slice(-3).reverse()
    },
    trends: {
      ticketVolume: kpiData.map(k => k.totalTickets),
      csatTrend: kpiData.map(k => k.csatScore)
    }
  };
}
