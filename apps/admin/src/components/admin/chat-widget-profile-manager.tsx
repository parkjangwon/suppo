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

type ChatWidgetProfile = {
  id: string;
  name: string;
  widgetKey: string;
  buttonLabel: string;
  buttonImageUrl: string | null;
  buttonImageFit: string;
  buttonBorderColor: string | null;
  buttonBorderWidth: number;
  buttonHoverEffect: string;
  buttonBadgeText: string | null;
  buttonBadgeColor: string;
  buttonBadgePosition: string;
  showUnreadBadge: boolean;
  buttonSize: string;
  buttonShape: string;
  buttonShadow: string;
  welcomeTitle: string;
  welcomeMessage: string;
  accentColor: string;
  position: string;
  enabled: boolean;
  isDefault: boolean;
};

function buildEmptyForm(t: (key: string, ko: string, en?: string) => string) {
  return {
  name: "",
  widgetKey: "",
  buttonLabel: t("chatProfileDefaultButtonLabel", "브랜드 상담", "Brand support"),
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
  welcomeTitle: t("chatProfileDefaultWelcomeTitle", "브랜드 상담", "Brand support"),
  welcomeMessage: t("chatProfileDefaultWelcomeMessage", "안녕하세요! 무엇을 도와드릴까요?", "Hello. How can we help?"),
  accentColor: "#0f172a",
  };
}

export function ChatWidgetProfileManager() {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const [profiles, setProfiles] = useState<ChatWidgetProfile[]>([]);
  const [form, setForm] = useState(buildEmptyForm(t));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function fetchProfiles() {
    const response = await fetch("/api/admin/chat/widget-profiles");
    if (!response.ok) {
      toast.error(t("chatProfileLoadFailed", "위젯 프로필을 불러오지 못했습니다.", "Failed to load widget profiles."));
      return;
    }

    const data = await response.json();
    setProfiles(data);
  }

  useEffect(() => {
    void fetchProfiles();
  }, []);

  function resetForm() {
    setForm(buildEmptyForm(t));
    setEditingId(null);
  }

  async function saveProfile() {
    const payload = {
      ...form,
      buttonImageUrl: form.buttonImageUrl || (editingId ? null : undefined),
      buttonImageFit: form.buttonImageFit,
      buttonBorderColor: form.buttonBorderColor || (editingId ? null : undefined),
      buttonBadgeText: form.buttonBadgeText || (editingId ? null : undefined),
      buttonBadgeColor: form.buttonBadgeColor,
      buttonBadgePosition: form.buttonBadgePosition,
      position: "bottom-right",
      ...(editingId ? {} : { enabled: true }),
    };

    const response = await fetch(
      editingId ? `/api/admin/chat/widget-profiles/${editingId}` : "/api/admin/chat/widget-profiles",
      {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? (editingId
        ? t("chatProfileUpdateFailed", "위젯 프로필 수정에 실패했습니다.", "Failed to update widget profile.")
        : t("chatProfileCreateFailed", "위젯 프로필 생성에 실패했습니다.", "Failed to create widget profile.")));
      return;
    }

    resetForm();
    await fetchProfiles();
    toast.success(editingId
      ? t("chatProfileUpdateSuccess", "위젯 프로필이 수정되었습니다.", "Widget profile updated.")
      : t("chatProfileCreateSuccess", "위젯 프로필이 생성되었습니다.", "Widget profile created."));
  }

  function beginEdit(profile: ChatWidgetProfile) {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      widgetKey: profile.widgetKey,
      buttonLabel: profile.buttonLabel,
      buttonImageUrl: profile.buttonImageUrl ?? "",
      buttonImageFit: profile.buttonImageFit,
      buttonBorderColor: profile.buttonBorderColor ?? "",
      buttonBorderWidth: profile.buttonBorderWidth,
      buttonHoverEffect: profile.buttonHoverEffect,
      buttonBadgeText: profile.buttonBadgeText ?? "",
      buttonBadgeColor: profile.buttonBadgeColor,
      buttonBadgePosition: profile.buttonBadgePosition,
      showUnreadBadge: profile.showUnreadBadge,
      buttonSize: profile.buttonSize,
      buttonShape: profile.buttonShape,
      buttonShadow: profile.buttonShadow,
      welcomeTitle: profile.welcomeTitle,
      welcomeMessage: profile.welcomeMessage,
      accentColor: profile.accentColor,
    });
  }

  async function deleteProfile(profile: ChatWidgetProfile) {
    const response = await fetch(`/api/admin/chat/widget-profiles/${profile.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      toast.error(t("chatProfileDeleteFailed", "위젯 프로필 삭제에 실패했습니다.", "Failed to delete widget profile."));
      return;
    }

    if (editingId === profile.id) {
      resetForm();
    }
    await fetchProfiles();
    toast.success(t("chatProfileDeleteSuccess", "위젯 프로필이 삭제되었습니다.", "Widget profile deleted."));
  }

  async function toggleProfile(profile: ChatWidgetProfile, enabled: boolean) {
    const response = await fetch(`/api/admin/chat/widget-profiles/${profile.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      toast.error(t("chatProfileStatusFailed", "위젯 프로필 상태 변경에 실패했습니다.", "Failed to update widget profile status."));
      return;
    }

    await fetchProfiles();
  }

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "chat-profile-button");

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
      toast.success(t("chatProfileButtonImageSuccess", "프로필 버튼 이미지를 업로드했습니다.", "Profile button image uploaded."));
    } catch (error) {
      toast.error(t("chatProfileButtonImageFailed", "프로필 버튼 이미지 업로드에 실패했습니다.", "Failed to upload profile button image."));
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function copyEmbedSnippet(profile: ChatWidgetProfile) {
    const snippet = `<script src="YOUR_PUBLIC_HELPDESK_URL/chat-sdk.js" data-crinity-chat-sdk="true" data-widget-key="${profile.widgetKey}"></script>`;
    await navigator.clipboard.writeText(snippet);
    toast.success(t("chatProfileEmbedCopied", "임베드 코드가 복사되었습니다.", "Embed code copied."));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("chatProfileTitle", "위젯 프로필", "Widget profiles")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("chatProfileDescription", "브랜드/서비스별로 별도 widgetKey를 발급해 다른 플로팅 위젯을 운영합니다.", "Issue separate widget keys per brand or service to run different floating widgets.")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-name">{t("chatProfileName", "프로필 이름", "Profile name")}</Label>
            <Input
              id="chat-widget-profile-name"
              aria-label={t("chatProfileName", "프로필 이름", "Profile name")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-key">widgetKey</Label>
            <Input
              id="chat-widget-profile-key"
              aria-label="widgetKey"
              value={form.widgetKey}
              onChange={(event) => setForm((prev) => ({ ...prev, widgetKey: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-button-label">{t("chatProfileButtonLabel", "버튼 라벨", "Button label")}</Label>
            <Input
              id="chat-widget-profile-button-label"
              aria-label={t("chatProfileButtonLabel", "버튼 라벨", "Button label")}
              value={form.buttonLabel}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonLabel: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-button-image-url">{t("chatProfileButtonImageUrl", "버튼 이미지 URL", "Button image URL")}</Label>
            <Input
              id="chat-widget-profile-button-image-url"
              aria-label={t("chatProfileButtonImageUrl", "버튼 이미지 URL", "Button image URL")}
              value={form.buttonImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonImageUrl: event.target.value }))}
            />
            <div className="flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                aria-label={t("chatProfileButtonImageUpload", "프로필 버튼 이미지 업로드", "Upload profile button image")}
                accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImageUpload(file);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isUploading}>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? copy.commonUploading : t("chatProfileButtonImageUpload", "이미지 업로드", "Upload image")}
              </Button>
              {form.buttonImageUrl ? (
                <Button type="button" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, buttonImageUrl: "" }))}>
                  <X className="mr-2 h-4 w-4" />
                  {t("chatWidgetRemoveImage", "이미지 제거", "Remove image")}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("chatProfileImageFit", "이미지 맞춤 방식", "Image fit")}</Label>
            <Select value={form.buttonImageFit} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonImageFit: value }))}>
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
            <Label htmlFor="chat-widget-profile-title">{t("chatProfileWelcomeTitle", "환영 제목", "Welcome title")}</Label>
            <Input
              id="chat-widget-profile-title"
              aria-label={t("chatProfileWelcomeTitle", "환영 제목", "Welcome title")}
              value={form.welcomeTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, welcomeTitle: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="chat-widget-profile-message">{t("chatProfileWelcomeMessage", "환영 메시지", "Welcome message")}</Label>
            <Textarea
              id="chat-widget-profile-message"
              aria-label={t("chatProfileWelcomeMessage", "환영 메시지", "Welcome message")}
              rows={3}
              value={form.welcomeMessage}
              onChange={(event) => setForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-color">{t("chatProfilePointColor", "포인트 컬러", "Accent color")}</Label>
            <Input
              id="chat-widget-profile-color"
              aria-label={t("chatProfilePointColor", "포인트 컬러", "Accent color")}
              value={form.accentColor}
              onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-border-color">{t("chatProfileBorderColor", "테두리 색상", "Border color")}</Label>
            <Input
              id="chat-widget-profile-border-color"
              aria-label={t("chatProfileBorderColor", "테두리 색상", "Border color")}
              value={form.buttonBorderColor}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderColor: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-badge-color">{t("chatProfileBadgeColor", "배지 색상", "Badge color")}</Label>
            <Input
              id="chat-widget-profile-badge-color"
              aria-label={t("chatProfileBadgeColor", "배지 색상", "Badge color")}
              value={form.buttonBadgeColor}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeColor: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-border-width">{t("chatProfileBorderThickness", "테두리 두께", "Border thickness")}</Label>
            <Input
              id="chat-widget-profile-border-width"
              aria-label={t("chatProfileBorderThickness", "테두리 두께", "Border thickness")}
              type="number"
              value={form.buttonBorderWidth}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderWidth: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("chatProfileHoverEffect", "호버 효과", "Hover effect")}</Label>
            <Select value={form.buttonHoverEffect} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonHoverEffect: value }))}>
              <SelectTrigger aria-label={t("chatProfileHoverEffect", "호버 효과", "Hover effect")}>
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
          <div className="space-y-2">
            <Label>{t("chatProfileBadgePosition", "배지 위치", "Badge position")}</Label>
            <Select value={form.buttonBadgePosition} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonBadgePosition: value }))}>
              <SelectTrigger aria-label={t("chatProfileBadgePosition", "배지 위치", "Badge position")}>
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
          <div className="space-y-2">
            <Label>{t("chatProfileButtonSize", "버튼 크기", "Button size")}</Label>
            <Select value={form.buttonSize} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonSize: value }))}>
              <SelectTrigger aria-label={t("chatProfileButtonSize", "버튼 크기", "Button size")}>
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
            <Label>{t("chatProfileButtonShape", "버튼 모양", "Button shape")}</Label>
            <Select value={form.buttonShape} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShape: value }))}>
              <SelectTrigger aria-label={t("chatProfileButtonShape", "버튼 모양", "Button shape")}>
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
            <Label>{t("chatProfileButtonShadow", "버튼 그림자", "Button shadow")}</Label>
            <Select value={form.buttonShadow} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShadow: value }))}>
              <SelectTrigger aria-label={t("chatProfileButtonShadow", "버튼 그림자", "Button shadow")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noneOption", "없음", "None")}</SelectItem>
                <SelectItem value="soft">{t("shadowSoft", "기본", "Soft")}</SelectItem>
                <SelectItem value="strong">{t("shadowStrong", "강하게", "Strong")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-badge-text">{t("chatProfileBadgeFixed", "고정 배지 텍스트", "Fixed badge text")}</Label>
            <Input
              id="chat-widget-profile-badge-text"
              aria-label={t("chatProfileBadgeFixed", "고정 배지 텍스트", "Fixed badge text")}
              value={form.buttonBadgeText}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeText: event.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <div>
              <div className="font-medium">{t("chatProfileBadgeShow", "미읽음 배지 표시", "Show unread badge")}</div>
              <div className="text-sm text-muted-foreground">{t("chatProfileBadgeShowDesc", "새 메시지가 오면 버튼에 숫자를 표시합니다.", "Show a count on the button when a new message arrives.")}</div>
            </div>
            <Switch
              aria-label={t("chatProfileBadgeShow", "프로필 미읽음 배지 표시", "Show unread badge")}
              checked={form.showUnreadBadge}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showUnreadBadge: checked }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("chatProfilePreview", "프로필 버튼 미리보기", "Profile button preview")}</Label>
          <ChatWidgetButtonPreview form={form} className="min-h-[180px]" />
        </div>

        <div className="flex justify-end gap-2">
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              {t("chatProfileEditCancel", "수정 취소", "Cancel editing")}
            </Button>
          ) : null}
          <Button onClick={saveProfile}>{editingId ? t("chatProfileUpdateButton", "프로필 수정", "Update profile") : t("chatProfileAdd", "프로필 추가", "Add profile")}</Button>
        </div>

        <div className="space-y-3">
          {profiles.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("chatProfileEmpty", "등록된 위젯 프로필이 없습니다.", "No widget profiles have been created.")}</div>
          ) : (
            profiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">{profile.name}</div>
                    <div className="text-sm text-muted-foreground">{profile.widgetKey}</div>
                    <div className="text-sm text-muted-foreground">
                      {profile.buttonImageUrl ? t("chatProfileUsesImageButton", "이미지 버튼 사용", "Uses image button") : profile.buttonLabel} · {profile.welcomeTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile.buttonSize} · {profile.buttonShape} · {profile.buttonShadow}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(profile)}>
                        {copy.commonEdit}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyEmbedSnippet(profile)}>
                        {t("chatProfileCopyEmbed", "임베드 코드 복사", "Copy embed code")}
                      </Button>
                      {!profile.isDefault ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void deleteProfile(profile)}>
                          {copy.commonDelete}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="min-w-[180px]">
                      <ChatWidgetButtonPreview
                        form={profile}
                        unreadCount={3}
                        className="min-h-[148px] p-4"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.isDefault ? <span className="text-xs text-primary">{t("chatProfileDefault", "기본", "Default")}</span> : null}
                      <Switch
                        aria-label={`widget-profile-enabled-${profile.name}`}
                        checked={profile.enabled}
                        onCheckedChange={(checked) => void toggleProfile(profile, checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
