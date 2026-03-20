"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Viewer {
  agentId: string;
  agentName: string;
  lastSeenAt: string;
}

interface UseTicketPresenceOptions {
  ticketId: string;
  pollInterval?: number;
}

export function useTicketPresence({
  ticketId,
  pollInterval = 15000,
}: UseTicketPresenceOptions) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const heartbeat = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/tickets/${ticketId}/presence`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update presence");
      }

      const data = await response.json();
      setViewers(data.viewers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [ticketId]);

  const fetchViewers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/tickets/${ticketId}/presence`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch viewers");
      }

      const data = await response.json();
      setViewers(data.viewers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const removePresence = useCallback(async () => {
    try {
      await fetch(`/api/admin/tickets/${ticketId}/presence`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to remove presence:", err);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    // Initial heartbeat
    heartbeat();

    // Set up polling
    intervalRef.current = setInterval(() => {
      heartbeat();
    }, pollInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      removePresence();
    };
  }, [ticketId, pollInterval, heartbeat, removePresence]);

  return {
    viewers,
    isLoading,
    error,
    refresh: fetchViewers,
  };
}
