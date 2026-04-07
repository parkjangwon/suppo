"use client";

import { useEffect, useState } from "react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@crinity/ui/components/ui/dialog";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Switch } from "@crinity/ui/components/ui/switch";
import { toast } from "sonner";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeyManager() {
  const copy = useAdminCopy() as Record<string, string>;
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  async function fetchApiKeys() {
    const response = await fetch("/api/admin/integrations/api-keys");
    if (!response.ok) {
      throw new Error("failed to load api keys");
    }
    const data = await response.json();
    setApiKeys(data);
  }

  useEffect(() => {
    void fetchApiKeys().catch(() => {
      toast.error(copy.apiKeyLoadFailed ?? "API 키를 불러오지 못했습니다.");
    });
  }, []);

  async function createApiKey() {
    try {
      const response = await fetch("/api/admin/integrations/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response.ok) {
        throw new Error("failed to create key");
      }

      const data = await response.json();
      setIssuedKey(data.plaintextKey);
      setNewKeyName("");
      await fetchApiKeys();
    } catch (error) {
      toast.error(copy.apiKeyCreateFailed ?? "API 키 생성에 실패했습니다.");
    }
  }

  async function toggleApiKey(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/integrations/api-keys/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("failed to update key");
      }

      await fetchApiKeys();
    } catch (error) {
      toast.error(copy.apiKeyToggleFailed ?? "API 키 상태 변경에 실패했습니다.");
    }
  }

  async function deleteApiKey(id: string) {
    try {
      const response = await fetch(`/api/admin/integrations/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("failed to delete key");
      }

      await fetchApiKeys();
    } catch (error) {
      toast.error(copy.apiKeyDeleteFailed ?? "API 키 삭제에 실패했습니다.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{copy.apiKeyTitle ?? "공개 API 키"}</CardTitle>
          <p className="text-sm text-muted-foreground">{copy.apiKeyDescription ?? "외부 시스템이 티켓 API를 호출할 때 사용하는 키입니다."}</p>
        </div>
        <Button onClick={() => {
          setIssuedKey(null);
          setIsDialogOpen(true);
        }}>
          {copy.apiKeyCreateButton ?? "API 키 발급"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.commonNone ?? "발급된 API 키가 없습니다."}</p>
        ) : (
          apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-medium">{apiKey.name}</div>
                  <div className="text-sm text-muted-foreground">{apiKey.keyPrefix}...</div>
                  <div className="text-xs text-muted-foreground">
                    {copy.gitApiKeyLastUsed ?? "마지막 사용"}: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString("ko-KR") : (copy.commonNone ?? "없음")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={apiKey.isActive}
                    onCheckedChange={(checked) => toggleApiKey(apiKey.id, checked)}
                    aria-label={`toggle-api-key-${apiKey.name}`}
                  />
                  <Button variant="outline" size="sm" onClick={() => deleteApiKey(apiKey.id)}>
                    {copy.commonDelete ?? "삭제"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.apiKeyIssueTitle ?? "API 키 발급"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">{copy.apiKeyNameLabel ?? "키 이름"}</Label>
              <Input
                id="api-key-name"
                aria-label={copy.apiKeyNameAriaLabel ?? "키 이름"}
                value={newKeyName}
                onChange={(event) => setNewKeyName(event.target.value)}
                placeholder={copy.apiKeyNamePlaceholder ?? "예: Zapier Integration"}
              />
            </div>
            {issuedKey ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-sm font-medium">{copy.apiKeyIssuedLabel ?? "발급된 키"}</div>
                <div className="mt-2 break-all font-mono text-sm" aria-label="issued-api-key">
                  {issuedKey}
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {copy.commonClose ?? "닫기"}
              </Button>
              <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                {copy.commonCreate ?? "발급"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
