"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { NotificationEvent } from "@suppo/shared/notifications/sse-service";

const MAX_NOTIFICATIONS = 50;

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/admin/notifications/stream");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as NotificationEvent;
        setNotifications((prev) => {
          const next = [event, ...prev].slice(0, MAX_NOTIFICATIONS);
          return next;
        });
        setUnreadCount((n) => n + 1);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      // reconnect after 5s
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null;
        }
      }, 5_000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((n) => Math.max(0, n - 1));
  }, []);

  return { notifications, unreadCount, markAllRead, dismiss };
}
