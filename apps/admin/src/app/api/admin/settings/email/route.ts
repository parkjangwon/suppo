import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { createAuditLog } from "@/lib/audit/logger";
import {
  getDefaultEmailSettings,
  validateEmailSettings,
} from "@suppo/shared/email/settings";

const DEFAULT_SETTINGS_ID = "default";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.emailSettings.findUnique({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    if (!settings) {
      return NextResponse.json({
        id: DEFAULT_SETTINGS_ID,
        ...getDefaultEmailSettings(),
      });
    }

    const { smtpPassword, sesSecretKey, resendApiKey, ...safeSettings } = settings;
    
    return NextResponse.json({
      ...safeSettings,
      hasSmtpPassword: !!smtpPassword,
      hasSesSecretKey: !!sesSecretKey,
      hasResendApiKey: !!resendApiKey,
    });
  } catch (error) {
    console.error("Failed to fetch email settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch email settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const defaults = getDefaultEmailSettings();

    const data: Record<string, unknown> = {
      provider: body.provider || defaults.provider,
      smtpHost: body.smtpHost || null,
      smtpPort: body.smtpPort || defaults.smtpPort,
      smtpSecure: body.smtpSecure || false,
      smtpUser: body.smtpUser || null,
      fromEmail: body.fromEmail || defaults.fromEmail,
      fromName: body.fromName || defaults.fromName,
      sesAccessKey: body.sesAccessKey || null,
      sesRegion: body.sesRegion || defaults.sesRegion,
      resendApiKey: body.resendApiKey || null,
      customerEmailsEnabled: body.customerEmailsEnabled ?? defaults.customerEmailsEnabled,
      internalNotificationsEnabled:
        body.internalNotificationsEnabled ?? defaults.internalNotificationsEnabled,
      notifyOnNewTicket: body.notifyOnNewTicket ?? defaults.notifyOnNewTicket,
      notifyOnAssign: body.notifyOnAssign ?? defaults.notifyOnAssign,
      notifyOnComment: body.notifyOnComment ?? defaults.notifyOnComment,
      notifyOnStatusChange: body.notifyOnStatusChange ?? defaults.notifyOnStatusChange,
      notifyOnSlaWarning: body.notifyOnSlaWarning ?? defaults.notifyOnSlaWarning,
      notifyOnSlaBreach: body.notifyOnSlaBreach ?? defaults.notifyOnSlaBreach,
      notifyCustomerOnTicketCreated:
        body.notifyCustomerOnTicketCreated ?? defaults.notifyCustomerOnTicketCreated,
      notifyCustomerOnAgentReply:
        body.notifyCustomerOnAgentReply ?? defaults.notifyCustomerOnAgentReply,
      notifyCustomerOnStatusChange:
        body.notifyCustomerOnStatusChange ?? defaults.notifyCustomerOnStatusChange,
      notifyCustomerOnCsatSurvey:
        body.notifyCustomerOnCsatSurvey ?? defaults.notifyCustomerOnCsatSurvey,
      notificationEmail: body.notificationEmail || null,
      testMode: body.testMode || false,
    };

    if (body.smtpPassword) {
      data.smtpPassword = body.smtpPassword;
    }
    if (body.sesSecretKey) {
      data.sesSecretKey = body.sesSecretKey;
    }

    const validationErrors = validateEmailSettings(
      {
        ...defaults,
        ...data,
        smtpHost: (data.smtpHost as string | null) ?? "",
        smtpUser: (data.smtpUser as string | null) ?? "",
        smtpPassword: (data.smtpPassword as string | undefined) ?? body.smtpPassword ?? "",
        sesAccessKey: (data.sesAccessKey as string | null) ?? "",
        sesSecretKey: (data.sesSecretKey as string | undefined) ?? body.sesSecretKey ?? "",
        resendApiKey: (data.resendApiKey as string | null) ?? "",
        notificationEmail: (data.notificationEmail as string | null) ?? "",
      },
      {
        requireConfiguredProvider:
          Boolean(data.customerEmailsEnabled) ||
          Boolean(data.internalNotificationsEnabled),
      },
    );

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0] },
        { status: 400 },
      );
    }

    const settings = await prisma.emailSettings.upsert({
      where: { id: DEFAULT_SETTINGS_ID },
      update: data,
      create: {
        id: DEFAULT_SETTINGS_ID,
        ...data,
      },
    });

    await createAuditLog({
      actorId: session.user.id!,
      actorType: session.user.role as "ADMIN" | "AGENT",
      actorName: session.user.name || "Unknown",
      actorEmail: session.user.email || "Unknown",
      action: "SETTINGS_CHANGE",
      resourceType: "email_settings",
      resourceId: DEFAULT_SETTINGS_ID,
      description: "이메일 설정 변경",
      newValue: {
        provider: settings.provider,
        fromEmail: settings.fromEmail,
        customerEmailsEnabled: settings.customerEmailsEnabled,
        internalNotificationsEnabled: settings.internalNotificationsEnabled,
      }
    });

    const { smtpPassword, sesSecretKey, resendApiKey, ...safeSettings } = settings;
    
    return NextResponse.json({
      ...safeSettings,
      hasSmtpPassword: !!smtpPassword,
      hasSesSecretKey: !!sesSecretKey,
      hasResendApiKey: !!resendApiKey,
    });
  } catch (error) {
    console.error("Failed to update email settings:", error);
    return NextResponse.json(
      { error: "Failed to update email settings" },
      { status: 500 }
    );
  }
}
