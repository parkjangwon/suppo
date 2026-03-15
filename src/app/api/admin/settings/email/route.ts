import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { createAuditLog } from "@/lib/audit/logger";

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
        provider: "nodemailer",
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "no-reply@crinity.io",
        fromName: "Crinity Helpdesk",
        sesAccessKey: "",
        sesSecretKey: "",
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

    const data: Record<string, unknown> = {
      provider: body.provider || "nodemailer",
      smtpHost: body.smtpHost || null,
      smtpPort: body.smtpPort || 587,
      smtpSecure: body.smtpSecure || false,
      smtpUser: body.smtpUser || null,
      fromEmail: body.fromEmail || "no-reply@crinity.io",
      fromName: body.fromName || "Crinity Helpdesk",
      sesAccessKey: body.sesAccessKey || null,
      sesRegion: body.sesRegion || "ap-northeast-2",
      resendApiKey: body.resendApiKey || null,
      notificationsEnabled: body.notificationsEnabled ?? true,
      notifyOnNewTicket: body.notifyOnNewTicket ?? true,
      notifyOnAssign: body.notifyOnAssign ?? true,
      notifyOnComment: body.notifyOnComment ?? true,
      notifyOnStatusChange: body.notifyOnStatusChange ?? true,
      notificationEmail: body.notificationEmail || null,
      testMode: body.testMode || false,
    };

    if (body.smtpPassword) {
      data.smtpPassword = body.smtpPassword;
    }
    if (body.sesSecretKey) {
      data.sesSecretKey = body.sesSecretKey;
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
        notificationsEnabled: settings.notificationsEnabled
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
