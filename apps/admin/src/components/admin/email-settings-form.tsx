"use client";

import { useState, useEffect } from "react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Switch } from "@crinity/ui/components/ui/switch";
import { Loader2, Mail, Bell, Server } from "lucide-react";
import { toast } from "sonner";

interface EmailSettings {
  provider: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromEmail: string;
  fromName: string;
  sesAccessKey: string;
  sesRegion: string;
  resendApiKey: string;
  notificationsEnabled: boolean;
  notifyOnNewTicket: boolean;
  notifyOnAssign: boolean;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
  notificationEmail: string;
  testMode: boolean;
  hasSmtpPassword?: boolean;
  hasSesSecretKey?: boolean;
  hasResendApiKey?: boolean;
}

export function EmailSettingsForm() {
  const copy = useAdminCopy() as Record<string, string>;
  const [settings, setSettings] = useState<EmailSettings>({
    provider: "nodemailer",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    fromEmail: "no-reply@company.com",
    fromName: "Crinity Helpdesk",
    sesAccessKey: "",
    sesRegion: "ap-northeast-2",
    resendApiKey: "",
    notificationsEnabled: true,
    notifyOnNewTicket: true,
    notifyOnAssign: true,
    notifyOnComment: true,
    notifyOnStatusChange: true,
    notificationEmail: "",
    testMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [sesSecretKey, setSesSecretKey] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/email");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch email settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...settings,
        ...(smtpPassword ? { smtpPassword } : {}),
        ...(sesSecretKey ? { sesSecretKey } : {}),
      };

      const response = await fetch("/api/admin/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(copy.emailSaveSuccess ?? "이메일 설정이 저장되었습니다.");
        setSmtpPassword("");
        setSesSecretKey("");
        await fetchSettings();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Failed to save email settings:", error);
      toast.error(copy.emailSaveFailed ?? "이메일 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
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
            {copy.emailServerTitle ?? "이메일 서버 설정"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{copy.emailProviderLabel ?? "이메일 제공자"}</Label>
            <select
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="nodemailer">SMTP (Nodemailer)</option>
              <option value="ses">AWS SES</option>
              <option value="resend">Resend</option>
            </select>
          </div>

          {settings.provider === "nodemailer" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{copy.emailSmtpHostLabel ?? "SMTP 호스트"}</Label>
                  <Input
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{copy.emailSmtpPortLabel ?? "SMTP 포트"}</Label>
                  <Input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{copy.emailSmtpUserLabel ?? "SMTP 사용자"}</Label>
                <Input
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.emailSmtpPasswordLabel ?? "SMTP 비밀번호"} {settings.hasSmtpPassword && (copy.commonConnected ?? "(설정됨)")}</Label>
                <Input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={settings.hasSmtpPassword ? (copy.commonEdit ?? "변경하려면 입력") : (copy.emailPasswordPlaceholder ?? "비밀번호 입력")}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.smtpSecure}
                  onCheckedChange={(checked) => setSettings({ ...settings, smtpSecure: checked })}
                />
                <Label>{copy.emailSmtpSecureLabel ?? "SSL/TLS 사용 (포트 465)"}</Label>
              </div>
            </>
          )}

          {settings.provider === "ses" && (
            <>
              <div className="space-y-2">
                <Label>{copy.emailSesAccessKeyLabel ?? "AWS Access Key"}</Label>
                <Input
                  value={settings.sesAccessKey}
                  onChange={(e) => setSettings({ ...settings, sesAccessKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.emailSecretLabel ?? "AWS Secret Key"} {settings.hasSesSecretKey && (copy.commonConnected ?? "(설정됨)")}</Label>
                <Input
                  type="password"
                  value={sesSecretKey}
                  onChange={(e) => setSesSecretKey(e.target.value)}
                  placeholder={settings.hasSesSecretKey ? (copy.commonEdit ?? "변경하려면 입력") : (copy.emailSecretPlaceholder ?? "Secret Key 입력")}
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.emailSesRegionLabel ?? "AWS 리전"}</Label>
                <Input
                  value={settings.sesRegion}
                  onChange={(e) => setSettings({ ...settings, sesRegion: e.target.value })}
                />
              </div>
            </>
          )}

          {settings.provider === "resend" && (
            <div className="space-y-2">
              <Label>{copy.emailResendApiKeyLabel ?? "Resend API Key"} {settings.hasResendApiKey && (copy.commonConnected ?? "(설정됨)")}</Label>
              <Input
                value={settings.resendApiKey}
                onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
                placeholder="re_..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{copy.emailFromAddressLabel ?? "발신 이메일"}</Label>
              <Input
                value={settings.fromEmail}
                onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.emailFromNameLabel ?? "발신자 이름"}</Label>
              <Input
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {copy.emailNotificationTitle ?? "알림 설정"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{copy.emailNotificationsEnabledLabel ?? "이메일 알림 사용"}</Label>
              <p className="text-sm text-muted-foreground">{copy.emailNotificationsEnabledDesc ?? "모든 이메일 알림을 활성화/비활성화합니다"}</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
            />
          </div>

          {settings.notificationsEnabled && (
            <>
              <div className="space-y-2">
                <Label>{copy.emailNotificationEmailLabel ?? "관리자 알림 수신 이메일"}</Label>
                <Input
                  value={settings.notificationEmail}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                  placeholder={copy.emailNotificationEmailPlaceholder ?? "admin@company.com"}
                />
                <p className="text-xs text-muted-foreground">{copy.emailNotificationEmailDesc ?? "새 티켓 등록 시 알림을 받을 이메일 주소"}</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>{copy.emailNotifyNewTicketLabel ?? "새 티켓 알림"}</Label>
                  <Switch
                    checked={settings.notifyOnNewTicket}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnNewTicket: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{copy.emailNotifyAssignLabel ?? "담당자 할당 알림"}</Label>
                  <Switch
                    checked={settings.notifyOnAssign}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnAssign: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{copy.emailNotifyCommentLabel ?? "댓글 알림"}</Label>
                  <Switch
                    checked={settings.notifyOnComment}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnComment: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{copy.emailNotifyStatusChangeLabel ?? "상태 변경 알림"}</Label>
                  <Switch
                    checked={settings.notifyOnStatusChange}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnStatusChange: checked })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label className="text-base">{copy.emailTestModeLabel ?? "테스트 모드"}</Label>
              <p className="text-sm text-muted-foreground">{copy.emailTestModeDesc ?? "실제 이메일 대신 콘솔에 로그만 출력"}</p>
            </div>
            <Switch
              checked={settings.testMode}
              onCheckedChange={(checked) => setSettings({ ...settings, testMode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} size="lg">
        {isSaving ? (copy.commonSaving ?? "저장 중...") : (copy.commonSaveSettings ?? "설정 저장")}
      </Button>
    </div>
  );
}
