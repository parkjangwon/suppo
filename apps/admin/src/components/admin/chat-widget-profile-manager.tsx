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

const EMPTY_FORM = {
  name: "",
  widgetKey: "",
  buttonLabel: "브랜드 상담",
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
  welcomeTitle: "브랜드 상담",
  welcomeMessage: "안녕하세요! 무엇을 도와드릴까요?",
  accentColor: "#0f172a",
};

export function ChatWidgetProfileManager() {
  const [profiles, setProfiles] = useState<ChatWidgetProfile[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function fetchProfiles() {
    const response = await fetch("/api/admin/chat/widget-profiles");
    if (!response.ok) {
      toast.error("위젯 프로필을 불러오지 못했습니다.");
      return;
    }

    const data = await response.json();
    setProfiles(data);
  }

  useEffect(() => {
    void fetchProfiles();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
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
      toast.error(data?.error ?? (editingId ? "위젯 프로필 수정에 실패했습니다." : "위젯 프로필 생성에 실패했습니다."));
      return;
    }

    resetForm();
    await fetchProfiles();
    toast.success(editingId ? "위젯 프로필이 수정되었습니다." : "위젯 프로필이 생성되었습니다.");
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
      toast.error("위젯 프로필 삭제에 실패했습니다.");
      return;
    }

    if (editingId === profile.id) {
      resetForm();
    }
    await fetchProfiles();
    toast.success("위젯 프로필이 삭제되었습니다.");
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
      toast.error("위젯 프로필 상태 변경에 실패했습니다.");
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
      toast.success("프로필 버튼 이미지를 업로드했습니다.");
    } catch (error) {
      toast.error("프로필 버튼 이미지 업로드에 실패했습니다.");
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
    toast.success("임베드 코드가 복사되었습니다.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>위젯 프로필</CardTitle>
        <p className="text-sm text-muted-foreground">브랜드/서비스별로 별도 widgetKey를 발급해 다른 플로팅 위젯을 운영합니다.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-name">프로필 이름</Label>
            <Input
              id="chat-widget-profile-name"
              aria-label="프로필 이름"
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
            <Label htmlFor="chat-widget-profile-button-label">버튼 라벨</Label>
            <Input
              id="chat-widget-profile-button-label"
              aria-label="프로필 버튼 라벨"
              value={form.buttonLabel}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonLabel: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-button-image-url">버튼 이미지 URL</Label>
            <Input
              id="chat-widget-profile-button-image-url"
              aria-label="프로필 버튼 이미지 URL"
              value={form.buttonImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonImageUrl: event.target.value }))}
            />
            <div className="flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                aria-label="프로필 버튼 이미지 업로드"
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
          <div className="space-y-2">
            <Label>이미지 맞춤 방식</Label>
            <Select value={form.buttonImageFit} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonImageFit: value }))}>
              <SelectTrigger aria-label="프로필 이미지 맞춤 방식">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">비율 유지</SelectItem>
                <SelectItem value="cover">가득 채우기</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-title">환영 제목</Label>
            <Input
              id="chat-widget-profile-title"
              aria-label="프로필 환영 제목"
              value={form.welcomeTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, welcomeTitle: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="chat-widget-profile-message">환영 메시지</Label>
            <Textarea
              id="chat-widget-profile-message"
              aria-label="프로필 환영 메시지"
              rows={3}
              value={form.welcomeMessage}
              onChange={(event) => setForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-color">포인트 컬러</Label>
            <Input
              id="chat-widget-profile-color"
              aria-label="프로필 포인트 컬러"
              value={form.accentColor}
              onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-border-color">테두리 색상</Label>
            <Input
              id="chat-widget-profile-border-color"
              aria-label="프로필 테두리 색상"
              value={form.buttonBorderColor}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderColor: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-badge-color">배지 색상</Label>
            <Input
              id="chat-widget-profile-badge-color"
              aria-label="프로필 배지 색상"
              value={form.buttonBadgeColor}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeColor: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-border-width">테두리 두께</Label>
            <Input
              id="chat-widget-profile-border-width"
              aria-label="프로필 테두리 두께"
              type="number"
              value={form.buttonBorderWidth}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBorderWidth: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>호버 효과</Label>
            <Select value={form.buttonHoverEffect} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonHoverEffect: value }))}>
              <SelectTrigger aria-label="프로필 호버 효과">
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
          <div className="space-y-2">
            <Label>배지 위치</Label>
            <Select value={form.buttonBadgePosition} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonBadgePosition: value }))}>
              <SelectTrigger aria-label="프로필 배지 위치">
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
          <div className="space-y-2">
            <Label>버튼 크기</Label>
            <Select value={form.buttonSize} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonSize: value }))}>
              <SelectTrigger aria-label="프로필 버튼 크기">
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
            <Select value={form.buttonShape} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShape: value }))}>
              <SelectTrigger aria-label="프로필 버튼 모양">
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
            <Select value={form.buttonShadow} onValueChange={(value) => setForm((prev) => ({ ...prev, buttonShadow: value }))}>
              <SelectTrigger aria-label="프로필 버튼 그림자">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                <SelectItem value="soft">기본</SelectItem>
                <SelectItem value="strong">강하게</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-widget-profile-badge-text">고정 배지 텍스트</Label>
            <Input
              id="chat-widget-profile-badge-text"
              aria-label="프로필 고정 배지 텍스트"
              value={form.buttonBadgeText}
              onChange={(event) => setForm((prev) => ({ ...prev, buttonBadgeText: event.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <div>
              <div className="font-medium">미읽음 배지 표시</div>
              <div className="text-sm text-muted-foreground">새 메시지가 오면 버튼에 숫자를 표시합니다.</div>
            </div>
            <Switch
              aria-label="프로필 미읽음 배지 표시"
              checked={form.showUnreadBadge}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showUnreadBadge: checked }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>프로필 버튼 미리보기</Label>
          <ChatWidgetButtonPreview form={form} className="min-h-[180px]" />
        </div>

        <div className="flex justify-end gap-2">
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              수정 취소
            </Button>
          ) : null}
          <Button onClick={saveProfile}>{editingId ? "프로필 수정" : "프로필 추가"}</Button>
        </div>

        <div className="space-y-3">
          {profiles.length === 0 ? (
            <div className="text-sm text-muted-foreground">등록된 위젯 프로필이 없습니다.</div>
          ) : (
            profiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">{profile.name}</div>
                    <div className="text-sm text-muted-foreground">{profile.widgetKey}</div>
                    <div className="text-sm text-muted-foreground">
                      {profile.buttonImageUrl ? "이미지 버튼 사용" : profile.buttonLabel} · {profile.welcomeTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile.buttonSize} · {profile.buttonShape} · {profile.buttonShadow}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(profile)}>
                        수정
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyEmbedSnippet(profile)}>
                        임베드 코드 복사
                      </Button>
                      {!profile.isDefault ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void deleteProfile(profile)}>
                          삭제
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
                      {profile.isDefault ? <span className="text-xs text-primary">기본</span> : null}
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
