"use client";

import * as React from "react";
import { Bell, X, Ticket, MessageSquare, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@suppo/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@suppo/ui/components/ui/popover";
import { cn } from "@suppo/shared/utils";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationEvent } from "@suppo/shared/notifications/sse-service";

const TYPE_META: Record<
  NotificationEvent["type"],
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  "ticket.assigned": { icon: Ticket, label: "티켓 배정", color: "text-blue-500" },
  "ticket.commented": { icon: MessageSquare, label: "새 댓글", color: "text-green-500" },
  "ticket.status_changed": { icon: RefreshCw, label: "상태 변경", color: "text-purple-500" },
  "sla.warning": { icon: AlertTriangle, label: "SLA 경고", color: "text-amber-500" },
};

function NotificationItem({
  event,
  onDismiss,
}: {
  event: NotificationEvent;
  onDismiss: (id: string) => void;
}) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const ts = new Date(event.timestamp);
  const timeStr = ts.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/50",
        !event.read && "bg-primary/5"
      )}
    >
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted", meta.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{event.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{event.message}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">{timeStr}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(event.id)}
        className="absolute right-2 top-2 hidden rounded-md p-0.5 text-muted-foreground hover:text-foreground group-hover:flex"
        aria-label="닫기"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = React.useState(false);

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (val && unreadCount > 0) markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl"
          aria-label="알림"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">알림</span>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => {
                notifications.forEach((n) => dismiss(n.id));
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              모두 지우기
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">새 알림이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {notifications.map((n) => (
                <NotificationItem key={n.id} event={n} onDismiss={dismiss} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
