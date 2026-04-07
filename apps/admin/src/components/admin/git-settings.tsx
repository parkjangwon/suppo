"use client";

import { useState } from "react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { useRouter } from "next/navigation";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@crinity/ui/components/ui/card";
import { Badge } from "@crinity/ui/components/ui/badge";
import { Switch } from "@crinity/ui/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crinity/ui/components/ui/dialog";
import { toast } from "sonner";
import { Github, Gitlab, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface GitCredential {
  provider: "GITHUB" | "GITLAB";
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface GitSettingsProps {
  initialCredentials: GitCredential[];
}

const providerInfo = {
  GITHUB: {
    name: "GitHub",
    icon: Github,
    color: "bg-gray-900 text-white",
    tokenUrl: "https://github.com/settings/tokens",
    scopeInfo: "repo, read:user",
    description: "프라이빗 리포지토리 접근을 위해 'repo' 스코프가 필요합니다.",
  },
  GITLAB: {
    name: "GitLab",
    icon: Gitlab,
    color: "bg-orange-500 text-white",
    tokenUrl: "https://gitlab.com/-/profile/personal_access_tokens",
    scopeInfo: "api, read_repository, write_repository",
    description: "API 접근 및 리포지토리 읽기/쓰기 권한이 필요합니다.",
  },
};

export function GitSettings({ initialCredentials }: GitSettingsProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<keyof typeof providerInfo | null>(null);
  const [token, setToken] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!selectedProvider || !token.trim()) {
      toast.error(t("gitProviderTokenRequired", "프로바이더와 토큰을 입력해주세요", "Enter a provider and token."));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/git/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          token: token.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("gitSaveFailed", "저장에 실패했습니다", "Failed to save."));
      }

      toast.success(t("gitSaveSuccess", `${providerInfo[selectedProvider].name} 자격증명이 저장되었습니다`, `${providerInfo[selectedProvider].name} credentials saved.`));
      setCredentials((prev) => [
        ...prev.filter((c) => c.provider !== selectedProvider),
        {
          provider: selectedProvider,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      setIsDialogOpen(false);
      setToken("");
      setSelectedProvider(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("gitSaveError", "오류가 발생했습니다", "An error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (provider: keyof typeof providerInfo) => {
    if (!confirm(t("gitDeleteConfirm", `${providerInfo[provider].name} 자격증명을 삭제하시겠습니까?`, `Delete ${providerInfo[provider].name} credentials?`))) return;

    try {
      const response = await fetch(`/api/git/credentials?provider=${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(t("gitDeleteFailed", "삭제에 실패했습니다", "Failed to delete."));

      setCredentials((prev) => prev.filter((c) => c.provider !== provider));
      toast.success(t("gitDeleteSuccess", "자격증명이 삭제되었습니다", "Credentials deleted."));
      router.refresh();
    } catch (error) {
      toast.error(t("gitDeleteError", "삭제에 실패했습니다", "Failed to delete."));
    }
  };

  const openAddDialog = (provider: keyof typeof providerInfo) => {
    setSelectedProvider(provider);
    setToken("");
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {(Object.keys(providerInfo) as Array<keyof typeof providerInfo>).map((provider) => {
          const info = providerInfo[provider];
          const Icon = info.icon;
          const existing = credentials.find((c) => c.provider === provider);

          return (
            <Card key={provider} className={existing ? "border-green-500/50" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${info.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {existing ? t("gitConnected", "연결됨", "Connected") : t("gitDisconnected", "미연결", "Disconnected")}
                      </CardDescription>
                    </div>
                  </div>
                  {existing ? (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t("gitConnected", "연결됨", "Connected")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t("gitDisconnected", "미연결", "Disconnected")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{info.description}</p>

                <div className="space-y-2">
                  <Label className="text-xs">{t("gitRequiredScopes", "필요한 권한", "Required scopes")}</Label>
                  <code className="block p-2 bg-muted rounded text-xs">{info.scopeInfo}</code>
                </div>

                <div className="flex gap-2">
                  {existing ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => openAddDialog(provider)}
                      >
                        {t("gitUpdateToken", "토큰 업데이트", "Update token")}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(provider)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" onClick={() => openAddDialog(provider)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("gitConnectButton", "연결하기", "Connect")}
                    </Button>
                  )}
                </div>

                <a
                  href={info.tokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-center text-blue-600 hover:underline"
                >
                  {t("gitOpenTokenPage", "토큰 생성 페이지로 이동", "Open token page")} →
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedProvider && `${providerInfo[selectedProvider].name} ${t("gitConnectDialogSuffix", "연결", "connection")}`}
            </DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("gitAccessToken", "액세스 토큰", "Access token")}</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  {providerInfo[selectedProvider].description}
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>{t("gitSecurityNotice", "보안 안내:", "Security notice:")}</strong> {t("gitSecurityBody", "토큰은 AES-256-GCM으로 암호화되어 저장됩니다. 토큰은 관리자만 접근 가능하며, 절대 외부에 노출되지 않습니다.", "Tokens are stored encrypted with AES-256-GCM. Only admins can access them and they are never exposed externally.")}
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSubmitting || !token.trim()}
                className="w-full"
              >
                {isSubmitting ? copy.commonSaving : copy.commonSave}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">{t("gitUsageTitle", "사용 방법", "How to use")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("gitUsageStep1", "1. 위에서 원하는 Git 프로바이더를 선택하여 연결합니다.", "1. Choose the Git provider you want above and connect it.")}</p>
          <p>{t("gitUsageStep2", '2. 티켓 상세 페이지에서 "Git 연동" 섹션을 확인합니다.', '2. Open the "Git Integration" section on the ticket detail page.')}</p>
          <p>{t("gitUsageStep3", "3. 저장소 이름(owner/repo)을 입력하고 이슈를 검색하거나 생성합니다.", "3. Enter the repository name (owner/repo) and search for or create issues.")}</p>
          <p>{t("gitUsageStep4", "4. 티켓과 Git 이슈가 연결되면 타임라인에서 커밋/PR 이력을 확인할 수 있습니다.", "4. Once a ticket and Git issue are linked, you can review commit/PR history in the timeline.")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
