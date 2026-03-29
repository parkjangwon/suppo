// Gamification System - Badges, Points, Leaderboards
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: BadgeCondition;
}

export interface BadgeCondition {
  type: "tickets_resolved" | "csat_score" | "response_time" | "streak_days";
  threshold: number;
}

export interface AgentStats {
  agentId: string;
  agentName: string;
  ticketsResolved: number;
  averageCsat: number;
  averageResponseTime: number;
  currentStreak: number;
  points: number;
  badges: string[];
}

export class GamificationEngine {
  private badges: Map<string, Badge> = new Map();
  private agentStats: Map<string, AgentStats> = new Map();
  
  constructor() {
    this.initializeBadges();
  }
  
  private initializeBadges(): void {
    const defaultBadges: Badge[] = [
      {
        id: "first_ticket",
        name: "First Steps",
        description: "Resolve your first ticket",
        icon: "🎯",
        condition: { type: "tickets_resolved", threshold: 1 }
      },
      {
        id: "speed_demon",
        name: "Speed Demon",
        description: "Resolve 10 tickets with average response time under 5 minutes",
        icon: "⚡",
        condition: { type: "response_time", threshold: 5 }
      },
      {
        id: "customer_love",
        name: "Customer Love",
        description: "Achieve 4.5+ CSAT score for 20 tickets",
        icon: "❤️",
        condition: { type: "csat_score", threshold: 4.5 }
      },
      {
        id: "rockstar",
        name: "Rockstar",
        description: "Resolve 100 tickets",
        icon: "🌟",
        condition: { type: "tickets_resolved", threshold: 100 }
      },
      {
        id: "consistent",
        name: "Consistent",
        description: "Work 30 days in a row",
        icon: "🔥",
        condition: { type: "streak_days", threshold: 30 }
      }
    ];
    
    defaultBadges.forEach(badge => this.badges.set(badge.id, badge));
  }
  
  recordTicketResolved(agentId: string, responseTimeMinutes: number): void {
    const stats = this.getOrCreateStats(agentId);
    stats.ticketsResolved++;
    
    // Update average response time
    const totalTime = stats.averageResponseTime * (stats.ticketsResolved - 1);
    stats.averageResponseTime = (totalTime + responseTimeMinutes) / stats.ticketsResolved;
    
    // Award points
    stats.points += 10;
    if (responseTimeMinutes < 5) stats.points += 5;
    
    this.checkBadges(agentId);
  }
  
  recordCsat(agentId: string, rating: number): void {
    const stats = this.getOrCreateStats(agentId);
    
    // Update average CSAT
    const totalCsat = stats.averageCsat * (stats.ticketsResolved - 1);
    stats.averageCsat = (totalCsat + rating) / stats.ticketsResolved;
    
    // Award points for high CSAT
    if (rating >= 4) stats.points += 5;
    if (rating === 5) stats.points += 10;
    
    this.checkBadges(agentId);
  }
  
  recordDailyActivity(agentId: string): void {
    const stats = this.getOrCreateStats(agentId);
    stats.currentStreak++;
    stats.points += 2;
    
    this.checkBadges(agentId);
  }
  
  getLeaderboard(limit: number = 10): AgentStats[] {
    return Array.from(this.agentStats.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }
  
  getAgentStats(agentId: string): AgentStats | null {
    return this.agentStats.get(agentId) || null;
  }
  
  private getOrCreateStats(agentId: string): AgentStats {
    if (!this.agentStats.has(agentId)) {
      this.agentStats.set(agentId, {
        agentId,
        agentName: `Agent ${agentId}`,
        ticketsResolved: 0,
        averageCsat: 0,
        averageResponseTime: 0,
        currentStreak: 0,
        points: 0,
        badges: []
      });
    }
    return this.agentStats.get(agentId)!;
  }
  
  private checkBadges(agentId: string): void {
    const stats = this.agentStats.get(agentId);
    if (!stats) return;
    
    for (const [badgeId, badge] of this.badges) {
      if (stats.badges.includes(badgeId)) continue;
      
      let earned = false;
      switch (badge.condition.type) {
        case "tickets_resolved":
          earned = stats.ticketsResolved >= badge.condition.threshold;
          break;
        case "csat_score":
          earned = stats.averageCsat >= badge.condition.threshold;
          break;
        case "response_time":
          earned = stats.averageResponseTime <= badge.condition.threshold;
          break;
        case "streak_days":
          earned = stats.currentStreak >= badge.condition.threshold;
          break;
      }
      
      if (earned) {
        stats.badges.push(badgeId);
        stats.points += 50; // Badge bonus
      }
    }
  }
}

export const gamificationEngine = new GamificationEngine();
