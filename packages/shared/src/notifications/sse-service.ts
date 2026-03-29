export interface NotificationEvent {
  id: string;
  type: "ticket.assigned" | "ticket.commented" | "ticket.status_changed" | "sla.warning";
  title: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

export class NotificationService {
  private clients: Map<string, ReadableStreamDefaultController> = new Map();

  subscribe(agentId: string, controller: ReadableStreamDefaultController): void {
    this.clients.set(agentId, controller);
  }

  unsubscribe(agentId: string): void {
    this.clients.delete(agentId);
  }

  notify(agentId: string, event: NotificationEvent): void {
    const controller = this.clients.get(agentId);
    if (controller) {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    }
  }

  broadcast(event: NotificationEvent): void {
    for (const [, controller] of this.clients) {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    }
  }
}

export const notificationService = new NotificationService();
