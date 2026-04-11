"use client";

import { useEffect, useState } from "react";
import { Brain, Loader2, PlugZap, Server } from "lucide-react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Switch } from "@crinity/ui/components/ui/switch";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { toast } from "sonner";
import { DEFAULT_LLM_SETTINGS } from "@/lib/settings/default-llm-settings";

interface LLMSettings {
  provider: string;
  ollamaUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  geminiModel: string;
  analysisEnabled: boolean;
  analysisPrompt: string;
  hasGeminiApiKey?: boolean;
}

function normalizeSettings(data: Partial<LLMSettings>): LLMSettings {
  return {
    provider: data.provider ?? DEFAULT_SETTINGS.provider,
    ollamaUrl: data.ollamaUrl ?? DEFAULT_SETTINGS.ollamaUrl,
    ollamaModel: data.ollamaModel ?? DEFAULT_SETTINGS.ollamaModel,
    geminiApiKey: data.geminiApiKey ?? DEFAULT_SETTINGS.geminiApiKey,
    geminiModel: data.geminiModel ?? DEFAULT_SETTINGS.geminiModel,
    analysisEnabled: data.analysisEnabled ?? DEFAULT_SETTINGS.analysisEnabled,
    analysisPrompt: data.analysisPrompt ?? DEFAULT_SETTINGS.analysisPrompt,
    hasGeminiApiKey: data.hasGeminiApiKey,
  };
}

const DEFAULT_SETTINGS: LLMSettings = {
  ...DEFAULT_LLM_SETTINGS,
};

export function LLMSettingsForm() {
  const copy = useAdminCopy() as Record<string, string>;
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionMessage, setTestConnectionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/llm");
      if (response.ok) {
        const data = await response.json();
        setSettings(normalizeSettings(data));
      }
    } catch (error) {
      console.error("Failed to fetch LLM settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = { ...settings };
      if (geminiApiKey) {
        payload.geminiApiKey = geminiApiKey;
      }

      const response = await fetch("/api/admin/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save LLM settings");
      }

      toast.success(copy.llmSaveSuccess ?? "LLM 설정이 저장되었습니다.");
      setGeminiApiKey("");
      await fetchSettings();
    } catch (error) {
      console.error("Failed to save LLM settings:", error);
      toast.error(copy.llmSaveFailed ?? "LLM 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestOllamaConnection = async () => {
    setIsTestingConnection(true);
    setTestConnectionMessage(null);

    try {
      const response = await fetch("/api/llm/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.ollamaModel,
          prompt: "test",
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setTestConnectionMessage(copy.llmOllamaSuccess ?? "연결 성공: Ollama 서버가 응답했습니다.");
    } catch (error) {
      console.error("Failed to test Ollama connection:", error);
      setTestConnectionMessage(copy.llmOllamaFailed ?? "연결 실패: Ollama 서버에 접근할 수 없습니다.");
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {copy.llmProviderTitle ?? "LLM 제공자 설정"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{copy.llmProviderLabel ?? "LLM 제공자"}</Label>
            <select
              value={settings.provider}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  provider: event.target.value,
                })
              }
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="ollama">Ollama</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {settings.provider === "ollama" && (
            <>
              <div className="space-y-2">
                <Label>{copy.llmOllamaUrlLabel ?? "Ollama URL"}</Label>
                <Input
                  value={settings.ollamaUrl}
                  onChange={(event) =>
                    setSettings({ ...settings, ollamaUrl: event.target.value })
                  }
                  placeholder="http://localhost:11434"
                />
              </div>

              <div className="space-y-2">
                <Label>{copy.llmOllamaModelLabel ?? "Ollama 모델명"}</Label>
                <Input
                  value={settings.ollamaModel}
                  onChange={(event) =>
                    setSettings({ ...settings, ollamaModel: event.target.value })
                  }
                  placeholder={DEFAULT_LLM_SETTINGS.ollamaModel}
                />
              </div>

              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                {copy.llmOllamaDesc ?? "로컬 또는 사설 네트워크의 Ollama 서버를 사용할 수 있습니다."}
              </div>
            </>
          )}

          {settings.provider === "gemini" && (
            <>
              <div className="space-y-2">
                <Label>{copy.llmGeminiApiKeyLabel ?? "Gemini API Key"} {settings.hasGeminiApiKey ? (copy.commonConnected ?? "(설정됨)") : ""}</Label>
                <Input
                  type="password"
                  value={geminiApiKey}
                  onChange={(event) => setGeminiApiKey(event.target.value)}
                  placeholder={settings.hasGeminiApiKey ? (copy.commonEdit ?? "변경하려면 입력") : "AIza..."}
                />
              </div>

              <div className="space-y-2">
                <Label>{copy.llmGeminiModelLabel ?? "Gemini 모델명"}</Label>
                <Input
                  value={settings.geminiModel}
                  onChange={(event) =>
                    setSettings({ ...settings, geminiModel: event.target.value })
                  }
                  placeholder="gemini-1.5-flash"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {copy.llmAnalysisTitle ?? "분석 설정"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{copy.llmAnalysisEnabledLabel ?? "AI 분석 활성화"}</Label>
              <p className="text-sm text-muted-foreground">
                {copy.llmAnalysisEnabledDesc ?? "티켓 내용 분석 및 보조 제안을 활성화합니다."}
              </p>
            </div>
            <Switch
              checked={settings.analysisEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, analysisEnabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{copy.llmAnalysisPromptLabel ?? "커스텀 프롬프트 (선택)"}</Label>
            <Textarea
              value={settings.analysisPrompt}
              onChange={(event) =>
                setSettings({ ...settings, analysisPrompt: event.target.value })
              }
              placeholder={copy.llmAnalysisPromptPlaceholder ?? "추가 분석 지시사항을 입력하세요. 티켓 히스토리는 자동으로 포함됩니다.&#10;&#10;예: 고객 문의를 한국어로 분류하고, 우선순위와 답변 초안을 제안해 주세요."}
              rows={5}
            />
            <p className="text-sm text-muted-foreground">
              {copy.llmAnalysisPromptDesc ?? "비워두면 기본 분석 지시사항이 사용됩니다. 티켓 히스토리 데이터는 항상 포함됩니다."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {settings.provider === "ollama" && (
          <Button
            variant="outline"
            onClick={handleTestOllamaConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {copy.commonProcessing ?? "연결 테스트 중..."}
              </>
            ) : (
              <>
                <PlugZap className="mr-2 h-4 w-4" />
                {copy.llmOllamaTestButton ?? "Ollama 연결 테스트"}
              </>
            )}
          </Button>
        )}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {copy.commonSaving ?? "저장 중..."}
            </>
          ) : (
            copy.commonSaveSettings ?? "설정 저장"
          )}
        </Button>
      </div>

      {testConnectionMessage && (
        <p className="text-sm text-muted-foreground">{testConnectionMessage}</p>
      )}
    </div>
  );
}
