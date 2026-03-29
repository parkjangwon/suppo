"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ChatAutoRefresh({ conversationId }: { conversationId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const url = conversationId
      ? `/api/admin/chat/stream?conversationId=${conversationId}`
      : "/api/admin/chat/stream";
    const eventSource = new EventSource(url);
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 2000);

    eventSource.addEventListener("message", () => {
      router.refresh();
    });

    return () => {
      eventSource.close();
      window.clearInterval(intervalId);
    };
  }, [conversationId, router]);

  return null;
}
