"use client";

import { useEffect, useState } from "react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Checkbox } from "@suppo/ui/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@suppo/ui/components/ui/dialog";
import { Input } from "@suppo/ui/components/ui/input";
import { Label } from "@suppo/ui/components/ui/label";
import { Switch } from "@suppo/ui/components/ui/switch";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

const API_KEY_SCOPES = [
  { id: "tickets:read", label: "티켓 조회" },
  { id: "tickets:create", label: "티켓 생성" },
  { id: "tickets:update", label: "티켓 수정" },
] as const;

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
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
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["tickets:read", "tickets:create"]);
  const [sessionPlaintextKeys, setSessionPlaintextKeys] = useState<Record<string, string>>({});
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function markCopied(value: string) {
    setCopiedValue(value);
    window.setTimeout(() => {
      setCopiedValue((current) => (current === value ? null : current));
    }, 1500);
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    markCopied(text);
    toast.success(copy.commonCopiedLabel ?? `${label}이(가) 복사되었습니다.`);
  }

  async function createApiKey() {
    try {
      const response = await fetch("/api/admin/integrations/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newKeyName, scopes: selectedScopes }),
      });

      if (!response.ok) {
        throw new Error("failed to create key");
      }

      const data = await response.json();
      setIssuedKey(data.plaintextKey);
      setSessionPlaintextKeys((prev) => ({
        ...prev,
        [data.id]: data.plaintextKey,
      }));
      setNewKeyName("");
      setSelectedScopes(["tickets:read", "tickets:create"]);
      await fetchApiKeys();
    } catch {
      toast.error(copy.apiKeyCreateFailed ?? "API 키 생성에 실패했습니다.");
    }
  }

  async function updateApiKey(id: string, payload: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/admin/integrations/api-keys/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("failed to update key");
      }

      await fetchApiKeys();
    } catch {
      toast.error(copy.apiKeyToggleFailed ?? "API 키 상태 변경에 실패했습니다.");
    }
  }

  async function toggleApiKey(id: string, isActive: boolean) {
    await updateApiKey(id, { isActive });
  }

  async function updateScopes(id: string, scopes: string[]) {
    await updateApiKey(id, { scopes });
  }

  function toggleScope(nextScope: string, checked: boolean) {
    setSelectedScopes((prev) =>
      checked ? [...new Set([...prev, nextScope])] : prev.filter((scope) => scope !== nextScope)
    );
  }

  async function deleteApiKey(id: string) {
    try {
      const response = await fetch(`/api/admin/integrations/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("failed to delete key");
      }

      setSessionPlaintextKeys((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchApiKeys();
    } catch {
      toast.error(copy.apiKeyDeleteFailed ?? "API 키 삭제에 실패했습니다.");
    }
  }

  async function handleCopyIssuedKey() {
    if (!issuedKey) {
      return;
    }

    await copyToClipboard(issuedKey, copy.apiKeyIssuedLabel ?? "API 키");
  }

  async function handleCopyListKey(apiKey: ApiKeyRecord) {
    const plaintextKey = sessionPlaintextKeys[apiKey.id];

    if (!plaintextKey) {
      toast.error(
        copy.apiKeyCopyUnavailable ??
          "보안상 전체 API 키는 발급 시 1회만 확인할 수 있습니다. 필요하면 새 키를 발급하세요.",
      );
      return;
    }

    await copyToClipboard(plaintextKey, apiKey.name);
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
          setSelectedScopes(["tickets:read", "tickets:create"]);
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
                  {!sessionPlaintextKeys[apiKey.id] ? (
                    <div className="text-xs text-amber-600">
                      {copy.apiKeyCopyUnavailableHint ??
                        "보안상 전체 키는 발급 직후 1회만 복사할 수 있습니다."}
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    {copy.gitApiKeyLastUsed ?? "마지막 사용"}: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString("ko-KR") : (copy.commonNone ?? "없음")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    권한: {apiKey.scopes.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sessionPlaintextKeys[apiKey.id] ? (
                    <Button
                      variant="outline"
                      size="sm"
                      title={copy.commonCopy ?? "복사"}
                      onClick={() => void handleCopyListKey(apiKey)}
                    >
                      {copiedValue === sessionPlaintextKeys[apiKey.id] ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copy.commonCopy ?? "복사"}
                    </Button>
                  ) : null}
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
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {API_KEY_SCOPES.map((scope) => {
                  const checked = apiKey.scopes.includes(scope.id);
                  const nextScopes = checked
                    ? apiKey.scopes.filter((value) => value !== scope.id)
                    : [...apiKey.scopes, scope.id];

                  return (
                    <label key={scope.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        aria-label={`${apiKey.name}-${scope.id}`}
                        onCheckedChange={(nextChecked) =>
                          void updateScopes(apiKey.id, nextChecked ? [...new Set(nextScopes)] : nextScopes)
                        }
                      />
                      <span>{scope.label}</span>
                    </label>
                  );
                })}
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
            <div className="space-y-2">
              <Label>권한</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {API_KEY_SCOPES.map((scope) => (
                  <label key={scope.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedScopes.includes(scope.id)}
                      aria-label={`new-api-key-scope-${scope.id}`}
                      onCheckedChange={(checked) => toggleScope(scope.id, Boolean(checked))}
                    />
                    <span>{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {issuedKey ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{copy.apiKeyIssuedLabel ?? "발급된 키"}</div>
                  <Button variant="outline" size="sm" onClick={() => void handleCopyIssuedKey()}>
                    {copiedValue === issuedKey ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copy.commonCopy ?? "복사"}
                  </Button>
                </div>
                <div className="mt-2 break-all font-mono text-sm" aria-label="issued-api-key">
                  {issuedKey}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {copy.apiKeyIssuedHelp ?? "전체 키는 발급 후 이 화면 또는 현재 세션에서만 다시 복사할 수 있습니다."}
                </p>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {copy.commonClose ?? "닫기"}
              </Button>
              <Button onClick={createApiKey} disabled={!newKeyName.trim() || selectedScopes.length === 0}>
                {copy.commonCreate ?? "발급"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
