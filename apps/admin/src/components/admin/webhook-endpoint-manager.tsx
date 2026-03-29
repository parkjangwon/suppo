"use client";

import { useEffect, useState } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Checkbox } from "@crinity/ui/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@crinity/ui/components/ui/dialog";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Switch } from "@crinity/ui/components/ui/switch";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { id: "ticket.created", label: "티켓 생성" },
  { id: "ticket.updated", label: "티켓 수정" },
  { id: "ticket.commented", label: "댓글 등록" },
];

interface WebhookEndpointRecord {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
}

interface WebhookDeliveryRecord {
  id: string;
  event: string;
  isTest: boolean;
  responseStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export function WebhookEndpointManager() {
  const [webhooks, setWebhooks] = useState<WebhookEndpointRecord[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDeliveryRecord[]>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["ticket.created"]);

  async function fetchWebhooks() {
    const response = await fetch("/api/admin/integrations/webhooks");
    if (!response.ok) {
      throw new Error("failed to load webhooks");
    }
    const data = await response.json();
    setWebhooks(data);

    await Promise.all(
      (data as WebhookEndpointRecord[]).map(async (webhook) => {
        try {
          await fetchDeliveries(webhook.id);
        } catch {
          // Ignore per-webhook delivery load failures so the main list still renders.
        }
      }),
    );
  }

  async function fetchDeliveries(webhookId: string) {
    const response = await fetch(`/api/admin/integrations/webhooks/${webhookId}/deliveries`);
    if (!response.ok) {
      throw new Error("failed to load deliveries");
    }

    const data = await response.json();
    setDeliveries((prev) => ({ ...prev, [webhookId]: data }));
  }

  useEffect(() => {
    void fetchWebhooks().catch(() => {
      toast.error("Webhook 목록을 불러오지 못했습니다.");
    });
  }, []);

  async function createWebhook() {
    try {
      const response = await fetch("/api/admin/integrations/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          url,
          secret: secret || undefined,
          events: selectedEvents,
        }),
      });

      if (!response.ok) {
        throw new Error("failed to create webhook");
      }

      setIsDialogOpen(false);
      setName("");
      setUrl("");
      setSecret("");
      setSelectedEvents(["ticket.created"]);
      await fetchWebhooks();
    } catch (error) {
      toast.error("Webhook 생성에 실패했습니다.");
    }
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/integrations/webhooks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("failed to update webhook");
      }

      await fetchWebhooks();
    } catch (error) {
      toast.error("Webhook 상태 변경에 실패했습니다.");
    }
  }

  async function deleteWebhook(id: string) {
    try {
      const response = await fetch(`/api/admin/integrations/webhooks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("failed to delete webhook");
      }

      await fetchWebhooks();
    } catch (error) {
      toast.error("Webhook 삭제에 실패했습니다.");
    }
  }

  function toggleEvent(eventId: string, checked: boolean) {
    setSelectedEvents((prev) =>
      checked ? [...new Set([...prev, eventId])] : prev.filter((value) => value !== eventId)
    );
  }

  async function sendTestWebhook(webhookId: string) {
    setTestingId(webhookId);
    try {
      const response = await fetch(`/api/admin/integrations/webhooks/${webhookId}/test`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "failed to send test webhook");
      }

      await Promise.all([fetchWebhooks(), fetchDeliveries(webhookId)]);
      toast.success("테스트 webhook을 발송했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "테스트 webhook 발송에 실패했습니다.");
    } finally {
      setTestingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Outbound Webhook</CardTitle>
          <p className="text-sm text-muted-foreground">티켓 이벤트를 외부 URL로 POST 전송합니다.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Webhook 추가</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 Webhook이 없습니다.</p>
        ) : (
          webhooks.map((webhook) => (
            <div key={webhook.id} className="rounded-lg border p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium">{webhook.name}</div>
                    <div className="text-sm text-muted-foreground">{webhook.url}</div>
                    <div className="text-xs text-muted-foreground">이벤트: {webhook.events.join(", ")}</div>
                    <div className="text-xs text-muted-foreground">
                      마지막 호출: {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleString("ko-KR") : "없음"}
                    </div>
                    {webhook.lastStatusCode ? (
                      <div className="text-xs text-muted-foreground">최근 응답 코드: {webhook.lastStatusCode}</div>
                    ) : null}
                    {webhook.lastError ? (
                      <div className="text-xs text-destructive">{webhook.lastError}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void sendTestWebhook(webhook.id)}
                      disabled={testingId === webhook.id}
                    >
                      {testingId === webhook.id ? "전송 중..." : "테스트 발송"}
                    </Button>
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                      aria-label={`toggle-webhook-${webhook.name}`}
                    />
                    <Button variant="outline" size="sm" onClick={() => deleteWebhook(webhook.id)}>
                      삭제
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/10 p-3">
                  <div className="mb-2 text-sm font-medium">최근 호출 이력</div>
                  <div className="space-y-2">
                    {(deliveries[webhook.id] ?? []).length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        아직 호출 이력이 없습니다. 먼저 테스트 발송을 눌러 연결 상태를 확인하세요.
                      </div>
                    ) : (
                      deliveries[webhook.id].map((delivery) => (
                        <div key={delivery.id} className="rounded border bg-background p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {delivery.event}
                              {delivery.isTest ? " · 테스트" : ""}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(delivery.createdAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            응답 코드: {delivery.responseStatusCode ?? "없음"}
                          </div>
                          {delivery.errorMessage ? (
                            <div className="mt-1 text-destructive">{delivery.errorMessage}</div>
                          ) : null}
                          {delivery.responseBody ? (
                            <div className="mt-1 truncate text-muted-foreground">{delivery.responseBody}</div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">이름</Label>
              <Input id="webhook-name" aria-label="Webhook 이름" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input id="webhook-url" aria-label="Webhook URL" value={url} onChange={(event) => setUrl(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">서명 시크릿</Label>
              <Input id="webhook-secret" aria-label="Webhook 시크릿" value={secret} onChange={(event) => setSecret(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>이벤트</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={(checked) => toggleEvent(event.id, Boolean(checked))}
                      aria-label={`webhook-event-${event.id}`}
                    />
                    <span>{event.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                닫기
              </Button>
              <Button onClick={createWebhook} disabled={!name.trim() || !url.trim() || selectedEvents.length === 0}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
