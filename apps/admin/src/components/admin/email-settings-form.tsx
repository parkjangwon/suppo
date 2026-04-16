"use client";

import { useState, useEffect } from "react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { getDefaultEmailSettings } from "@crinity/shared/email/settings";
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
  customerEmailsEnabled: boolean;
  internalNotificationsEnabled: boolean;
  notifyOnNewTicket: boolean;
  notifyOnAssign: boolean;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
  notifyOnSlaWarning: boolean;
  notifyOnSlaBreach: boolean;
  notifyCustomerOnTicketCreated: boolean;
  notifyCustomerOnAgentReply: boolean;
  notifyCustomerOnStatusChange: boolean;
  notifyCustomerOnCsatSurvey: boolean;
  notificationEmail: string;
  testMode: boolean;
  hasSmtpPassword?: boolean;
  hasSesSecretKey?: boolean;
  hasResendApiKey?: boolean;
}

function normalizeSettings(
  input: Partial<EmailSettings> & {
    smtpHost?: string | null;
    smtpUser?: string | null;
    sesAccessKey?: string | null;
    resendApiKey?: string | null;
    notificationEmail?: string | null;
  }
): EmailSettings {
  const defaults = getDefaultEmailSettings();

  return {
    provider: input.provider ?? defaults.provider,
    smtpPort: input.smtpPort ?? defaults.smtpPort,
    smtpSecure: input.smtpSecure ?? defaults.smtpSecure,
    fromEmail: input.fromEmail ?? defaults.fromEmail,
    fromName: input.fromName ?? defaults.fromName,
    sesRegion: input.sesRegion ?? defaults.sesRegion,
    customerEmailsEnabled:
      input.customerEmailsEnabled ?? defaults.customerEmailsEnabled,
    internalNotificationsEnabled:
      input.internalNotificationsEnabled ?? defaults.internalNotificationsEnabled,
    notifyOnNewTicket: input.notifyOnNewTicket ?? defaults.notifyOnNewTicket,
    notifyOnAssign: input.notifyOnAssign ?? defaults.notifyOnAssign,
    notifyOnComment: input.notifyOnComment ?? defaults.notifyOnComment,
    notifyOnStatusChange:
      input.notifyOnStatusChange ?? defaults.notifyOnStatusChange,
    notifyOnSlaWarning:
      input.notifyOnSlaWarning ?? defaults.notifyOnSlaWarning,
    notifyOnSlaBreach:
      input.notifyOnSlaBreach ?? defaults.notifyOnSlaBreach,
    notifyCustomerOnTicketCreated:
      input.notifyCustomerOnTicketCreated ?? defaults.notifyCustomerOnTicketCreated,
    notifyCustomerOnAgentReply:
      input.notifyCustomerOnAgentReply ?? defaults.notifyCustomerOnAgentReply,
    notifyCustomerOnStatusChange:
      input.notifyCustomerOnStatusChange ?? defaults.notifyCustomerOnStatusChange,
    notifyCustomerOnCsatSurvey:
      input.notifyCustomerOnCsatSurvey ?? defaults.notifyCustomerOnCsatSurvey,
    testMode: input.testMode ?? defaults.testMode,
    smtpHost: input.smtpHost ?? defaults.smtpHost ?? "",
    smtpUser: input.smtpUser ?? defaults.smtpUser ?? "",
    sesAccessKey: input.sesAccessKey ?? defaults.sesAccessKey ?? "",
    resendApiKey: input.resendApiKey ?? defaults.resendApiKey ?? "",
    notificationEmail: input.notificationEmail ?? defaults.notificationEmail ?? "",
    hasSmtpPassword: input.hasSmtpPassword,
    hasSesSecretKey: input.hasSesSecretKey,
    hasResendApiKey: input.hasResendApiKey,
  };
}

export function EmailSettingsForm() {
  const copy = useAdminCopy() as Record<string, string>;
  const [settings, setSettings] = useState<EmailSettings>(normalizeSettings({}));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
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
        setSettings(normalizeSettings(data));
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

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const response = await fetch("/api/admin/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          ...(smtpPassword ? { smtpPassword } : {}),
          ...(sesSecretKey ? { sesSecretKey } : {}),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "테스트 메일 발송에 실패했습니다.");
      }

      toast.success(
        copy.emailTestSendSuccess ??
          `테스트 메일을 발송했습니다. 수신자: ${payload.recipient}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (copy.emailTestSendFailed ?? "테스트 메일 발송에 실패했습니다."));
    } finally {
      setIsSendingTest(false);
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
            {copy.emailNotificationTitle ?? "내부 알림 설정"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{copy.emailNotificationsEnabledLabel ?? "내부 이메일 알림 사용"}</Label>
              <p className="text-sm text-muted-foreground">{copy.emailNotificationsEnabledDesc ?? "관리자/상담원 대상 알림 메일을 활성화/비활성화합니다"}</p>
            </div>
            <Switch
              checked={settings.internalNotificationsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, internalNotificationsEnabled: checked })}
            />
          </div>

          {settings.internalNotificationsEnabled && (
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
                <div className="flex items-center justify-between">
                  <Label>{copy.emailNotifySlaWarningLabel ?? "SLA 경고 알림"}</Label>
                  <Switch
                    checked={settings.notifyOnSlaWarning}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnSlaWarning: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{copy.emailNotifySlaBreachLabel ?? "SLA 위반 알림"}</Label>
                  <Switch
                    checked={settings.notifyOnSlaBreach}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnSlaBreach: checked })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {copy.emailCustomerNotificationTitle ?? "고객 이메일 설정"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{copy.emailCustomerNotificationsEnabledLabel ?? "고객 안내 메일 사용"}</Label>
              <p className="text-sm text-muted-foreground">{copy.emailCustomerNotificationsEnabledDesc ?? "고객에게 발송되는 확인/응답/상태 안내 메일을 제어합니다"}</p>
            </div>
            <Switch
              checked={settings.customerEmailsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, customerEmailsEnabled: checked })}
            />
          </div>

          {settings.customerEmailsEnabled && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label>{copy.emailNotifyCustomerTicketCreatedLabel ?? "티켓 접수 확인 메일"}</Label>
                <Switch
                  checked={settings.notifyCustomerOnTicketCreated}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyCustomerOnTicketCreated: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{copy.emailNotifyCustomerAgentReplyLabel ?? "상담원 답변 알림"}</Label>
                <Switch
                  checked={settings.notifyCustomerOnAgentReply}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyCustomerOnAgentReply: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{copy.emailNotifyCustomerStatusChangeLabel ?? "상태 변경 안내"}</Label>
                <Switch
                  checked={settings.notifyCustomerOnStatusChange}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyCustomerOnStatusChange: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{copy.emailNotifyCustomerCsatLabel ?? "CSAT 설문 메일"}</Label>
                <Switch
                  checked={settings.notifyCustomerOnCsatSurvey}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyCustomerOnCsatSurvey: checked })}
                />
              </div>
            </div>
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

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleSendTestEmail} disabled={isSendingTest}>
          {isSendingTest ? (copy.commonProcessing ?? "처리 중...") : (copy.emailTestSendButton ?? "테스트 메일 보내기")}
        </Button>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (copy.commonSaving ?? "저장 중...") : (copy.commonSaveSettings ?? "설정 저장")}
        </Button>
      </div>
    </div>
  );
}
