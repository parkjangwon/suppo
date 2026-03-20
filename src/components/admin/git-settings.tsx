"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Github, Gitlab, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface GitCredential {
  provider: "GITHUB" | "GITLAB";
  createdAt: string;
  updatedAt: string;
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
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<keyof typeof providerInfo | null>(null);
  const [token, setToken] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!selectedProvider || !token.trim()) {
      toast.error("프로바이더와 토큰을 입력해주세요");
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
        throw new Error(error.message || "저장에 실패했습니다");
      }

      toast.success(`${providerInfo[selectedProvider].name} 자격증명이 저장되었습니다`);
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
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (provider: keyof typeof providerInfo) => {
    if (!confirm(`${providerInfo[provider].name} 자격증명을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/git/credentials?provider=${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("삭제에 실패했습니다");

      setCredentials((prev) => prev.filter((c) => c.provider !== provider));
      toast.success("자격증명이 삭제되었습니다");
      router.refresh();
    } catch (error) {
      toast.error("삭제에 실패했습니다");
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
                        {existing ? "연결됨" : "미연결"}
                      </CardDescription>
                    </div>
                  </div>
                  {existing ? (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      연결됨
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      미연결
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{info.description}</p>

                <div className="space-y-2">
                  <Label className="text-xs">필요한 권한</Label>
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
                        토큰 업데이트
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
                      연결하기
                    </Button>
                  )}
                </div>

                <a
                  href={info.tokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-center text-blue-600 hover:underline"
                >
                  토큰 생성 페이지로 이동 →
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
              {selectedProvider && providerInfo[selectedProvider].name} 연결
            </DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>액세스 토큰</Label>
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
                  <strong>보안 안내:</strong> 토큰은 AES-256-GCM으로 암호화되어 저장됩니다.
                  토큰은 관리자만 접근 가능하며, 절대 외부에 노출되지 않습니다.
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSubmitting || !token.trim()}
                className="w-full"
              >
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">사용 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 위에서 원하는 Git 프로바이더를 선택하여 연결합니다.</p>
          <p>2. 티켓 상세 페이지에서 &quot;Git 연동&quot; 섹션을 확인합니다.</p>
          <p>3. 저장소 이름(owner/repo)을 입력하고 이슈를 검색하거나 생성합니다.</p>
          <p>4. 티켓과 Git 이슈가 연결되면 타임라인에서 커밋/PR 이력을 확인할 수 있습니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
