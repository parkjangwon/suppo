// Real-Time Collaboration - Live editing and presence
export interface UserPresence {
  userId: string;
  userName: string;
  ticketId: string;
  cursor?: { x: number; y: number };
  selectedText?: string;
  lastActivity: Date;
}

export class CollaborationService {
  private presences: Map<string, UserPresence> = new Map();
  private subscribers: Map<string, Set<(presence: UserPresence) => void>> = new Map();
  
  joinTicket(userId: string, userName: string, ticketId: string): void {
    const presence: UserPresence = {
      userId,
      userName,
      ticketId,
      lastActivity: new Date()
    };
    
    this.presences.set(userId, presence);
    this.notifySubscribers(ticketId, presence);
  }
  
  leaveTicket(userId: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      this.presences.delete(userId);
      this.notifySubscribers(presence.ticketId, { ...presence, lastActivity: new Date() });
    }
  }
  
  updateCursor(userId: string, x: number, y: number): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.cursor = { x, y };
      presence.lastActivity = new Date();
      this.notifySubscribers(presence.ticketId, presence);
    }
  }
  
  updateSelection(userId: string, text: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.selectedText = text;
      presence.lastActivity = new Date();
      this.notifySubscribers(presence.ticketId, presence);
    }
  }
  
  getTicketPresences(ticketId: string): UserPresence[] {
    return Array.from(this.presences.values())
      .filter(p => p.ticketId === ticketId);
  }
  
  subscribe(ticketId: string, callback: (presence: UserPresence) => void): () => void {
    if (!this.subscribers.has(ticketId)) {
      this.subscribers.set(ticketId, new Set());
    }
    this.subscribers.get(ticketId)!.add(callback);
    
    return () => {
      this.subscribers.get(ticketId)?.delete(callback);
    };
  }
  
  private notifySubscribers(ticketId: string, presence: UserPresence): void {
    this.subscribers.get(ticketId)?.forEach(cb => cb(presence));
  }
}

export const collaborationService = new CollaborationService();
