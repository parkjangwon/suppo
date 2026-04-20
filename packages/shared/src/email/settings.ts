import type { EmailSettings } from "@prisma/client";

export type CustomerEmailEvent =
  | "ticketCreated"
  | "agentReply"
  | "statusChanged"
  | "csatSurvey";

export type InternalEmailEvent =
  | "newTicket"
  | "assign"
  | "comment"
  | "statusChange"
  | "slaWarning"
  | "slaBreach";

export const DEFAULT_EMAIL_SETTINGS = {
  id: "default",
  provider: "nodemailer",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  fromEmail: "no-reply@company.com",
  fromName: "Suppo Helpdesk",
  sesAccessKey: "",
  sesSecretKey: "",
  sesRegion: "ap-northeast-2",
  resendApiKey: "",
  customerEmailsEnabled: false,
  internalNotificationsEnabled: false,
  notifyOnNewTicket: true,
  notifyOnAssign: true,
  notifyOnComment: true,
  notifyOnStatusChange: true,
  notifyOnSlaWarning: true,
  notifyOnSlaBreach: true,
  notifyCustomerOnTicketCreated: false,
  notifyCustomerOnAgentReply: false,
  notifyCustomerOnStatusChange: false,
  notifyCustomerOnCsatSurvey: false,
  notificationEmail: "",
  testMode: false,
} as const;

export type EmailSettingsInput = Pick<
  EmailSettings,
  | "provider"
  | "smtpHost"
  | "smtpPort"
  | "smtpSecure"
  | "smtpUser"
  | "smtpPassword"
  | "fromEmail"
  | "fromName"
  | "sesAccessKey"
  | "sesSecretKey"
  | "sesRegion"
  | "resendApiKey"
  | "customerEmailsEnabled"
  | "internalNotificationsEnabled"
  | "notifyOnNewTicket"
  | "notifyOnAssign"
  | "notifyOnComment"
  | "notifyOnStatusChange"
  | "notifyOnSlaWarning"
  | "notifyOnSlaBreach"
  | "notifyCustomerOnTicketCreated"
  | "notifyCustomerOnAgentReply"
  | "notifyCustomerOnStatusChange"
  | "notifyCustomerOnCsatSurvey"
  | "notificationEmail"
  | "testMode"
>;

export function getDefaultEmailSettings(): EmailSettingsInput {
  return {
    provider: DEFAULT_EMAIL_SETTINGS.provider,
    smtpHost: DEFAULT_EMAIL_SETTINGS.smtpHost,
    smtpPort: DEFAULT_EMAIL_SETTINGS.smtpPort,
    smtpSecure: DEFAULT_EMAIL_SETTINGS.smtpSecure,
    smtpUser: DEFAULT_EMAIL_SETTINGS.smtpUser,
    smtpPassword: DEFAULT_EMAIL_SETTINGS.smtpPassword,
    fromEmail: DEFAULT_EMAIL_SETTINGS.fromEmail,
    fromName: DEFAULT_EMAIL_SETTINGS.fromName,
    sesAccessKey: DEFAULT_EMAIL_SETTINGS.sesAccessKey,
    sesSecretKey: DEFAULT_EMAIL_SETTINGS.sesSecretKey,
    sesRegion: DEFAULT_EMAIL_SETTINGS.sesRegion,
    resendApiKey: DEFAULT_EMAIL_SETTINGS.resendApiKey,
    customerEmailsEnabled: DEFAULT_EMAIL_SETTINGS.customerEmailsEnabled,
    internalNotificationsEnabled: DEFAULT_EMAIL_SETTINGS.internalNotificationsEnabled,
    notifyOnNewTicket: DEFAULT_EMAIL_SETTINGS.notifyOnNewTicket,
    notifyOnAssign: DEFAULT_EMAIL_SETTINGS.notifyOnAssign,
    notifyOnComment: DEFAULT_EMAIL_SETTINGS.notifyOnComment,
    notifyOnStatusChange: DEFAULT_EMAIL_SETTINGS.notifyOnStatusChange,
    notifyOnSlaWarning: DEFAULT_EMAIL_SETTINGS.notifyOnSlaWarning,
    notifyOnSlaBreach: DEFAULT_EMAIL_SETTINGS.notifyOnSlaBreach,
    notifyCustomerOnTicketCreated: DEFAULT_EMAIL_SETTINGS.notifyCustomerOnTicketCreated,
    notifyCustomerOnAgentReply: DEFAULT_EMAIL_SETTINGS.notifyCustomerOnAgentReply,
    notifyCustomerOnStatusChange: DEFAULT_EMAIL_SETTINGS.notifyCustomerOnStatusChange,
    notifyCustomerOnCsatSurvey: DEFAULT_EMAIL_SETTINGS.notifyCustomerOnCsatSurvey,
    notificationEmail: DEFAULT_EMAIL_SETTINGS.notificationEmail,
    testMode: DEFAULT_EMAIL_SETTINGS.testMode,
  };
}

export function formatEmailFrom(fromEmail: string, fromName?: string | null): string {
  if (!fromName?.trim()) {
    return fromEmail;
  }

  return `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>`;
}

export function shouldSendCustomerEmail(
  settings: EmailSettingsInput,
  event: CustomerEmailEvent,
): boolean {
  if (!settings.customerEmailsEnabled) {
    return false;
  }

  switch (event) {
    case "ticketCreated":
      return settings.notifyCustomerOnTicketCreated;
    case "agentReply":
      return settings.notifyCustomerOnAgentReply;
    case "statusChanged":
      return settings.notifyCustomerOnStatusChange;
    case "csatSurvey":
      return settings.notifyCustomerOnCsatSurvey;
  }
}

export function shouldSendInternalEmail(
  settings: EmailSettingsInput,
  event: InternalEmailEvent,
): boolean {
  if (!settings.internalNotificationsEnabled) {
    return false;
  }

  switch (event) {
    case "newTicket":
      return settings.notifyOnNewTicket;
    case "assign":
      return settings.notifyOnAssign;
    case "comment":
      return settings.notifyOnComment;
    case "statusChange":
      return settings.notifyOnStatusChange;
    case "slaWarning":
      return settings.notifyOnSlaWarning;
    case "slaBreach":
      return settings.notifyOnSlaBreach;
  }
}

export function validateEmailSettings(
  settings: EmailSettingsInput,
  options: { requireConfiguredProvider?: boolean } = {},
) {
  const errors: string[] = [];
  const requireConfiguredProvider = options.requireConfiguredProvider ?? false;
  const provider = settings.provider.toLowerCase();

  if (!settings.fromEmail?.trim()) {
    errors.push("발신 이메일을 입력해주세요.");
  }

  if (!requireConfiguredProvider) {
    return errors;
  }

  if (provider === "nodemailer") {
    if (!settings.smtpHost?.trim()) {
      errors.push("SMTP 호스트를 입력해주세요.");
    }
    if (settings.smtpUser?.trim() && !settings.smtpPassword?.trim()) {
      errors.push("SMTP 비밀번호를 입력해주세요.");
    }
  } else if (provider === "ses") {
    if (!settings.sesAccessKey?.trim()) {
      errors.push("AWS Access Key를 입력해주세요.");
    }
    if (!settings.sesSecretKey?.trim()) {
      errors.push("AWS Secret Key를 입력해주세요.");
    }
    if (!settings.sesRegion?.trim()) {
      errors.push("AWS 리전을 입력해주세요.");
    }
  } else if (provider === "resend") {
    if (!settings.resendApiKey?.trim()) {
      errors.push("Resend API Key를 입력해주세요.");
    }
  } else {
    errors.push(`지원하지 않는 이메일 제공자입니다: ${settings.provider}`);
  }

  return errors;
}
