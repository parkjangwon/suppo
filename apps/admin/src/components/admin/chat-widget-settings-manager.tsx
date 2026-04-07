"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

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
import { copyText } from "@/lib/i18n/admin-copy-utils";

export function ChatWidgetSettingsManager() {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
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
        toast.error(t("chatWidgetLoadFailed", "채팅 위젯 설정을 불러오지 못했습니다.", "Failed to load chat widget settings."));
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

      toast.success(t("chatWidgetSaveSuccess", "채팅 위젯 설정이 저장되었습니다.", "Chat widget settings saved."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("chatWidgetSaveFailed", "채팅 위젯 설정 저장에 실패했습니다.", "Failed to save chat widget settings."));
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
      toast.success(t("chatWidgetButtonImageSuccess", "버튼 이미지를 업로드했습니다.", "Button image uploaded."));
    } catch (error) {
      toast.error(t("chatWidgetButtonImageFailed", "버튼 이미지 업로드에 실패했습니다.", "Failed to upload button image."));
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
        <CardTitle>{t("settingsChatSettings", "채팅 위젯 설정", "Chat widget settings")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("chatWidgetDescription", "고객 위젯과 SDK 런처의 기본 테마와 문구를 설정합니다.", "Configure the default theme and copy for the customer widget and SDK launcher.")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">{t("chatWidgetFloatingEnable", "플로팅 채팅 버튼 활성화", "Enable floating chat button")}</div>
            <div className="text-sm text-muted-foreground">{t("chatWidgetFloatingEnableDesc", "public 포털에 기본 플로팅 버튼을 자동으로 삽입합니다.", "Automatically inject the default floating button into the public portal.")}</div>
          </div>
          <Switch
            aria-label={t("chatWidgetFloatingEnable", "플로팅 채팅 버튼 활성화", "Enable floating chat button")}
            checked={form.enabled}
            disabled={!isLoaded}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-button-label">{t("chatWidgetButtonLabel", "위젯 버튼 라벨", "Widget button label")}</Label>
          <Input
            id="chat-widget-button-label"
            aria-label={t("chatWidgetButtonLabel", "위젯 버튼 라벨", "Widget button label")}
            value={form.buttonLabel}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonLabel: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-button-image-url">{t("chatWidgetButtonImageUrl", "버튼 이미지 URL", "Button image URL")}</Label>
          <Input
            id="chat-widget-button-image-url"
            aria-label={t("chatWidgetButtonImageUrl", "버튼 이미지 URL", "Button image URL")}
            value={form.buttonImageUrl}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonImageUrl: event.target.value }))}
            placeholder="https://example.com/chat-button.png"
          />
          <p className="text-xs text-muted-foreground">{t("chatWidgetButtonImageDesc", "이미지가 있으면 플로팅 버튼 텍스트 대신 이미지가 표시됩니다.", "If an image is set, it is shown instead of the floating button text.")}</p>
          <div className="flex items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              aria-label={t("chatWidgetButtonImageUpload", "버튼 이미지 업로드", "Upload button image")}
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
              {isUploading ? t("commonUploading", "업로드 중...", "Uploading...") : t("chatWidgetButtonImageUpload", "이미지 업로드", "Upload image")}
            </Button>
            {form.buttonImageUrl ? (
              <Button type="button" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, buttonImageUrl: "" }))}>
                <X className="mr-2 h-4 w-4" />
                {t("chatWidgetRemoveImage", "이미지 제거", "Remove image")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("chatProfileImageFit", "이미지 맞춤 방식", "Image fit")}</Label>
            <Select
              value={form.buttonImageFit}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonImageFit: value }))}
            >
              <SelectTrigger aria-label={t("chatProfileImageFit", "이미지 맞춤 방식", "Image fit")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">{t("imageFitContain", "비율 유지", "Contain")}</SelectItem>
                <SelectItem value="cover">{t("imageFitCover", "가득 채우기", "Cover")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("chatWidgetButtonSize", "버튼 크기", "Button size")}</Label>
            <Select
              value={form.buttonSize}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonSize: value }))}
            >
              <SelectTrigger aria-label={t("chatWidgetButtonSize", "버튼 크기", "Button size")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">{t("sizeSmall", "작게", "Small")}</SelectItem>
                <SelectItem value="md">{t("sizeMedium", "보통", "Medium")}</SelectItem>
                <SelectItem value="lg">{t("sizeLarge", "크게", "Large")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("chatWidgetButtonShape", "버튼 모양", "Button shape")}</Label>
            <Select
              value={form.buttonShape}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShape: value }))}
            >
              <SelectTrigger aria-label={t("chatWidgetButtonShape", "버튼 모양", "Button shape")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pill">{t("shapePill", "캡슐형", "Pill")}</SelectItem>
                <SelectItem value="rounded">{t("shapeRounded", "둥근 사각형", "Rounded")}</SelectItem>
                <SelectItem value="circle">{t("shapeCircle", "원형", "Circle")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("chatWidgetButtonShadow", "버튼 그림자", "Button shadow")}</Label>
            <Select
              value={form.buttonShadow}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShadow: value }))}
            >
              <SelectTrigger aria-label={t("chatWidgetButtonShadow", "버튼 그림자", "Button shadow")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noneOption", "없음", "None")}</SelectItem>
                <SelectItem value="soft">{t("shadowSoft", "기본", "Soft")}</SelectItem>
                <SelectItem value="strong">{t("shadowStrong", "강하게", "Strong")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-border-color">{t("chatWidgetBorderColor", "테두리 색상", "Border color")}</Label>
            <Input
              id="chat-widget-border-color"
              aria-label={t("chatWidgetBorderColor", "테두리 색상", "Border color")}
              value={form.buttonBorderColor}
              disabled={!isLoaded}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderColor: event.target.value }))}
              placeholder="#ffffff"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-border-width">{t("chatWidgetBorderThickness", "테두리 두께", "Border thickness")}</Label>
            <Input
              id="chat-widget-border-width"
              aria-label={t("chatWidgetBorderThickness", "테두리 두께", "Border thickness")}
              type="number"
              value={form.buttonBorderWidth}
              disabled={!isLoaded}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderWidth: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("chatWidgetHoverEffect", "호버 효과", "Hover effect")}</Label>
            <Select
              value={form.buttonHoverEffect}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonHoverEffect: value }))}
            >
              <SelectTrigger aria-label={t("chatWidgetHoverEffect", "호버 효과", "Hover effect")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noneOption", "없음", "None")}</SelectItem>
                <SelectItem value="lift">{t("hoverLift", "살짝 뜨기", "Lift")}</SelectItem>
                <SelectItem value="glow">{t("hoverGlow", "광택 강조", "Glow")}</SelectItem>
                <SelectItem value="pulse">{t("hoverPulse", "펄스", "Pulse")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">{t("chatWidgetBadgeShow", "미읽음 배지 표시", "Show unread badge")}</div>
            <div className="text-sm text-muted-foreground">{t("chatWidgetBadgeShowDesc", "상담원이 새 메시지를 보내면 버튼에 미읽음 숫자를 표시합니다.", "Show an unread count on the button when agents send new messages.")}</div>
          </div>
          <Switch
            aria-label={t("chatWidgetBadgeShow", "미읽음 배지 표시", "Show unread badge")}
            checked={form.showUnreadBadge}
            disabled={!isLoaded}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showUnreadBadge: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-badge-text">{t("chatWidgetBadgeFixed", "고정 배지 텍스트", "Fixed badge text")}</Label>
          <Input
            id="chat-widget-badge-text"
            aria-label={t("chatWidgetBadgeFixed", "고정 배지 텍스트", "Fixed badge text")}
            value={form.buttonBadgeText}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeText: event.target.value }))}
            placeholder={t("badgeTextPlaceholder", "예: NEW", "e.g. NEW")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-badge-color">{t("chatWidgetBadgeColor", "배지 색상", "Badge color")}</Label>
            <Input
              id="chat-widget-badge-color"
              aria-label={t("chatWidgetBadgeColor", "배지 색상", "Badge color")}
              value={form.buttonBadgeColor}
              disabled={!isLoaded}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeColor: event.target.value }))}
              placeholder="#ef4444"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("chatWidgetBadgePosition", "배지 위치", "Badge position")}</Label>
            <Select
              value={form.buttonBadgePosition}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, buttonBadgePosition: value }))}
            >
              <SelectTrigger aria-label={t("chatWidgetBadgePosition", "배지 위치", "Badge position")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-right">{t("positionTopRight", "오른쪽 위", "Top right")}</SelectItem>
                <SelectItem value="top-left">{t("positionTopLeft", "왼쪽 위", "Top left")}</SelectItem>
                <SelectItem value="bottom-right">{t("positionBottomRight", "오른쪽 아래", "Bottom right")}</SelectItem>
                <SelectItem value="bottom-left">{t("positionBottomLeft", "왼쪽 아래", "Bottom left")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("chatWidgetPreview", "버튼 미리보기", "Button preview")}</Label>
          <ChatWidgetButtonPreview form={form} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-welcome-title">{t("chatWidgetWelcomeTitle", "위젯 환영 제목", "Widget welcome title")}</Label>
          <Input
            id="chat-widget-welcome-title"
            aria-label={t("chatWidgetWelcomeTitle", "위젯 환영 제목", "Widget welcome title")}
            value={form.welcomeTitle}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, welcomeTitle: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-widget-welcome-message">{t("chatWidgetWelcomeMessage", "위젯 환영 메시지", "Widget welcome message")}</Label>
          <Textarea
            id="chat-widget-welcome-message"
            aria-label={t("chatWidgetWelcomeMessage", "위젯 환영 메시지", "Widget welcome message")}
            value={form.welcomeMessage}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))}
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-accent-color">{t("chatWidgetPointColor", "포인트 컬러", "Accent color")}</Label>
            <Input
            id="chat-widget-accent-color"
            aria-label={t("chatWidgetPointColor", "포인트 컬러", "Accent color")}
            value={form.accentColor}
            disabled={!isLoaded}
            onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
          />
          </div>
          <div className="space-y-2">
            <Label>{t("chatWidgetLauncherPosition", "런처 위치", "Launcher position")}</Label>
            <Select
              value={form.position}
              disabled={!isLoaded}
              onValueChange={(value) => setForm((prev) => ({ ...prev, position: value }))}
            >
              <SelectTrigger aria-label={t("chatWidgetLauncherPosition", "런처 위치", "Launcher position")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">{t("positionBottomRight", "오른쪽 아래", "Bottom right")}</SelectItem>
                <SelectItem value="bottom-left">{t("positionBottomLeft", "왼쪽 아래", "Bottom left")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-agent-response-target">{t("chatWidgetAgentResponseTarget", "상담원 첫 응답 목표(분)", "Agent first-response target (minutes)")}</Label>
            <Input
              id="chat-widget-agent-response-target"
              aria-label={t("chatWidgetAgentResponseTarget", "상담원 첫 응답 목표(분)", "Agent first-response target (minutes)")}
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
            <Label htmlFor="chat-widget-customer-followup-target">{t("chatWidgetCustomerFollowupTarget", "고객 후속 응답 목표(분)", "Customer follow-up target (minutes)")}</Label>
            <Input
              id="chat-widget-customer-followup-target"
              aria-label={t("chatWidgetCustomerFollowupTarget", "고객 후속 응답 목표(분)", "Customer follow-up target (minutes)")}
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
            {isSaving ? copy.commonSaving : t("chatWidgetSaveButton", "위젯 설정 저장", "Save widget settings")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
