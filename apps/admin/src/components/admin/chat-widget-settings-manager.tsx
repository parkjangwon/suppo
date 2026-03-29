"use client";

import { useEffect, useRef, useState } from "react";

import { ChatWidgetButtonPreview } from "@/components/admin/chat-widget-button-preview";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { Switch } from "@crinity/ui/components/ui/switch";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

export function ChatWidgetSettingsManager() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    buttonLabel: "",
    buttonImageUrl: "",
    buttonImageFit: "contain",
    buttonBorderColor: "",
    buttonBorderWidth: 0,
    buttonHoverEffect: "lift",
    buttonBadgeText: "",
    buttonBadgeColor: "#ef4444",
    buttonBadgePosition: "top-right",
    showUnreadBadge: true,
    buttonSize: "md",
    buttonShape: "pill",
    buttonShadow: "soft",
    welcomeTitle: "",
    welcomeMessage: "",
    accentColor: "#0f172a",
    position: "bottom-right",
    agentResponseTargetMinutes: 5,
    customerFollowupTargetMinutes: 30,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/chat/widget-settings");
      if (!response.ok) {
        toast.error("채팅 위젯 설정을 불러오지 못했습니다.");
        return;
      }

      const data = await response.json();
      setForm({
        buttonLabel: data.buttonLabel,
        buttonImageUrl: data.buttonImageUrl ?? "",
        buttonImageFit: data.buttonImageFit,
        buttonBorderColor: data.buttonBorderColor ?? "",
        buttonBorderWidth: data.buttonBorderWidth,
        buttonHoverEffect: data.buttonHoverEffect,
        buttonBadgeText: data.buttonBadgeText ?? "",
        buttonBadgeColor: data.buttonBadgeColor,
        buttonBadgePosition: data.buttonBadgePosition,
        showUnreadBadge: data.showUnreadBadge,
        buttonSize: data.buttonSize,
        buttonShape: data.buttonShape,
        buttonShadow: data.buttonShadow,
        welcomeTitle: data.welcomeTitle,
        welcomeMessage: data.welcomeMessage,
        accentColor: data.accentColor,
        position: data.position,
        enabled: data.enabled,
        agentResponseTargetMinutes: data.agentResponseTargetMinutes,
        customerFollowupTargetMinutes: data.customerFollowupTargetMinutes,
      });
      setIsLoaded(true);
    })();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        buttonImageUrl: form.buttonImageUrl || null,
        buttonBorderColor: form.buttonBorderColor || null,
        buttonBadgeText: form.buttonBadgeText || null,
      };
      const response = await fetch("/api/admin/chat/widget-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "failed to save settings");
      }

      toast.success("채팅 위젯 설정이 저장되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "채팅 위젯 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "chat-button");

    setIsUploading(true);
    try {
      const response = await fetch("/api/admin/chat/widget-image-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("upload failed");
      }

      const data = await response.json();
      setForm((prev) => ({ ...prev, buttonImageUrl: data.url }));
      toast.success("버튼 이미지를 업로드했습니다.");
    } catch (error) {
      toast.error("버튼 이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>채팅 위젯 설정</CardTitle>
        <p className="text-sm text-muted-foreground">고객 위젯과 SDK 런처의 기본 테마와 문구를 설정합니다.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">플로팅 채팅 버튼 활성화</div>
            <div className="text-sm text-muted-foreground">public 포털에 기본 플로팅 버튼을 자동으로 삽입합니다.</div>
          </div>
          <Switch
            aria-label="플로팅 채팅 버튼 활성화"
            checked={form.enabled}
            disabled={!isLoaded}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-button-label">위젯 버튼 라벨</Label>
          <Input
            id="chat-widget-button-label"
            aria-label="위젯 버튼 라벨"
            value={form.buttonLabel}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonLabel: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-button-image-url">버튼 이미지 URL</Label>
          <Input
            id="chat-widget-button-image-url"
            aria-label="버튼 이미지 URL"
            value={form.buttonImageUrl}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonImageUrl: event.target.value }))}
            placeholder="https://example.com/chat-button.png"
          />
          <p className="text-xs text-muted-foreground">
            이미지가 있으면 플로팅 버튼 텍스트 대신 이미지가 표시됩니다.
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              aria-label="버튼 이미지 업로드"
              accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImageUpload(file);
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={!isLoaded || isUploading}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "업로드 중..." : "이미지 업로드"}
            </Button>
            {form.buttonImageUrl ? (
              <Button type="button" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, buttonImageUrl: "" }))}>
                <X className="mr-2 h-4 w-4" />
                이미지 제거
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>이미지 맞춤 방식</Label>
            <Select
              value={form.buttonImageFit}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonImageFit: value }))}
            >
              <SelectTrigger aria-label="이미지 맞춤 방식">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">비율 유지</SelectItem>
                <SelectItem value="cover">가득 채우기</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>버튼 크기</Label>
            <Select
              value={form.buttonSize}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonSize: value }))}
            >
              <SelectTrigger aria-label="버튼 크기">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">작게</SelectItem>
                <SelectItem value="md">보통</SelectItem>
                <SelectItem value="lg">크게</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>버튼 모양</Label>
            <Select
              value={form.buttonShape}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShape: value }))}
            >
              <SelectTrigger aria-label="버튼 모양">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pill">캡슐형</SelectItem>
                <SelectItem value="rounded">둥근 사각형</SelectItem>
                <SelectItem value="circle">원형</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>버튼 그림자</Label>
            <Select
              value={form.buttonShadow}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShadow: value }))}
            >
              <SelectTrigger aria-label="버튼 그림자">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                <SelectItem value="soft">기본</SelectItem>
                <SelectItem value="strong">강하게</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-border-color">테두리 색상</Label>
            <Input
              id="chat-widget-border-color"
              aria-label="테두리 색상"
              value={form.buttonBorderColor}
              disabled={!isLoaded}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderColor: event.target.value }))}
              placeholder="#ffffff"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-border-width">테두리 두께</Label>
            <Input
              id="chat-widget-border-width"
              aria-label="테두리 두께"
              type="number"
              value={form.buttonBorderWidth}
              disabled={!isLoaded}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderWidth: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>호버 효과</Label>
            <Select
              value={form.buttonHoverEffect}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonHoverEffect: value }))}
            >
              <SelectTrigger aria-label="호버 효과">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                <SelectItem value="lift">살짝 뜨기</SelectItem>
                <SelectItem value="glow">광택 강조</SelectItem>
                <SelectItem value="pulse">펄스</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">미읽음 배지 표시</div>
            <div className="text-sm text-muted-foreground">상담원이 새 메시지를 보내면 버튼에 미읽음 숫자를 표시합니다.</div>
          </div>
          <Switch
            aria-label="미읽음 배지 표시"
            checked={form.showUnreadBadge}
            disabled={!isLoaded}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showUnreadBadge: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-badge-text">고정 배지 텍스트</Label>
          <Input
            id="chat-widget-badge-text"
            aria-label="고정 배지 텍스트"
            value={form.buttonBadgeText}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeText: event.target.value }))}
            placeholder="예: NEW"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-badge-color">배지 색상</Label>
            <Input
              id="chat-widget-badge-color"
              aria-label="배지 색상"
              value={form.buttonBadgeColor}
              disabled={!isLoaded}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeColor: event.target.value }))}
              placeholder="#ef4444"
            />
          </div>
          <div className="space-y-2">
            <Label>배지 위치</Label>
            <Select
              value={form.buttonBadgePosition}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonBadgePosition: value }))}
            >
              <SelectTrigger aria-label="배지 위치">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-right">오른쪽 위</SelectItem>
                <SelectItem value="top-left">왼쪽 위</SelectItem>
                <SelectItem value="bottom-right">오른쪽 아래</SelectItem>
                <SelectItem value="bottom-left">왼쪽 아래</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>버튼 미리보기</Label>
          <ChatWidgetButtonPreview form={form} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-welcome-title">위젯 환영 제목</Label>
          <Input
            id="chat-widget-welcome-title"
            aria-label="위젯 환영 제목"
            value={form.welcomeTitle}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, welcomeTitle: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-welcome-message">위젯 환영 메시지</Label>
          <Textarea
            id="chat-widget-welcome-message"
            aria-label="위젯 환영 메시지"
            value={form.welcomeMessage}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))}
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-accent-color">포인트 컬러</Label>
            <Input
            id="chat-widget-accent-color"
            aria-label="포인트 컬러"
            value={form.accentColor}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
          />
          </div>
          <div className="space-y-2">
            <Label>런처 위치</Label>
            <Select
              value={form.position}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, position: value }))}
            >
              <SelectTrigger aria-label="런처 위치">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">오른쪽 아래</SelectItem>
                <SelectItem value="bottom-left">왼쪽 아래</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-agent-response-target">상담원 첫 응답 목표(분)</Label>
            <Input
              id="chat-widget-agent-response-target"
              aria-label="상담원 첫 응답 목표(분)"
              type="number"
              value={form.agentResponseTargetMinutes}
              disabled={!isLoaded}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  agentResponseTargetMinutes: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-customer-followup-target">고객 후속 응답 목표(분)</Label>
            <Input
              id="chat-widget-customer-followup-target"
              aria-label="고객 후속 응답 목표(분)"
              type="number"
              value={form.customerFollowupTargetMinutes}
              disabled={!isLoaded}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  customerFollowupTargetMinutes: Number(event.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !isLoaded}>
            {isSaving ? "저장 중..." : "위젯 설정 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
