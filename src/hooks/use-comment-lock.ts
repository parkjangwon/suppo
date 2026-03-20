"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface LockInfo {
  agentId: string;
  agentName: string;
  acquiredAt: string;
  expiresAt: string;
}

interface UseCommentLockOptions {
  ticketId: string;
  pollInterval?: number;
}

export function useCommentLock({
  ticketId,
  pollInterval = 10000,
}: UseCommentLockOptions) {
  const [lock, setLock] = useState<LockInfo | null>(null);
  const [isLockedByMe, setIsLockedByMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const acquireLock = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/tickets/${ticketId}/comment-lock`,
        {
          method: "POST",
        }
      );

      if (response.status === 409) {
        const data = await response.json();
        setLock({
          agentId: "",
          agentName: data.lockedBy,
          acquiredAt: "",
          expiresAt: data.expiresAt,
        });
        setIsLockedByMe(false);
        setError("Another agent is currently editing");
        return false;
      }

      if (!response.ok) {
        throw new Error("Failed to acquire lock");
      }

      const data = await response.json();
      setLock(data.lock);
      setIsLockedByMe(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const releaseLock = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/tickets/${ticketId}/comment-lock`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok && response.status !== 404) {
        throw new Error("Failed to release lock");
      }

      setLock(null);
      setIsLockedByMe(false);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, [ticketId]);

  const checkLock = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/tickets/${ticketId}/comment-lock`
      );

      if (!response.ok) {
        throw new Error("Failed to check lock");
      }

      const data = await response.json();

      if (data.locked) {
        setLock(data.lock);
        // Check if locked by current user
        const currentUserId = await getCurrentUserId();
        setIsLockedByMe(data.lock.agentId === currentUserId);
      } else {
        setLock(null);
        setIsLockedByMe(false);
      }
    } catch (err) {
      console.error("Failed to check lock:", err);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    // Initial check
    checkLock();

    // Set up polling
    intervalRef.current = setInterval(() => {
      checkLock();
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ticketId, pollInterval, checkLock]);

  return {
    lock,
    isLockedByMe,
    isLocked: !!lock,
    isLoading,
    error,
    acquireLock,
    releaseLock,
    refresh: checkLock,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    // This is a simplified approach - in a real app you'd get this from auth context
    const response = await fetch("/api/auth/session");
    if (!response.ok) return null;
    const data = await response.json();
    return data.user?.id || null;
  } catch {
    return null;
  }
}
