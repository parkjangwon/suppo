"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@crinity/ui/components/ui/button";
import { getTicketQueuePresets, type TicketQueueFilter } from "@/lib/tickets/ticket-queue-presets";

interface TicketQueueBarProps {
  currentAgentId?: string;
}

export function TicketQueueBar({ currentAgentId }: TicketQueueBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const presets = useMemo(() => getTicketQueuePresets(currentAgentId), [currentAgentId]);

  function applyQueue(filter: TicketQueueFilter) {
    const params = new URLSearchParams();

    Object.entries(filter).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const isActive = Object.entries(preset.filter).every(
          ([key, value]) => !value || searchParams.get(key) === value
        );

        return (
          <Button
            key={preset.key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => applyQueue(preset.filter)}
            title={preset.description}
          >
            {preset.label}
          </Button>
        );
      })}
    </div>
  );
}
