import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";

const DEFAULT_BRANDING_ID = "default";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branding = await prisma.systemBranding.findUnique({
      where: { id: DEFAULT_BRANDING_ID },
    });

    if (!branding) {
      return NextResponse.json({
        id: DEFAULT_BRANDING_ID,
        companyName: "Suppo",
        logoUrl: null,
        faviconUrl: null,
        primaryColor: "#0f172a",
        secondaryColor: "#3b82f6",
        homepageTitle: "Suppo Helpdesk",
        homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
        adminPanelTitle: "Suppo Admin",
        appTitle: "고객 지원 센터",
        welcomeMessage: "무엇을 도와드릴까요?",
        footerText: "© 2026 parkjangwon. All rights reserved.",
        footerPhone: null,
        footerEmail: null,
        footerHomepage: null,
        footerAddress: null,
        showPoweredBy: true,
        customCss: null,
      });
    }

    return NextResponse.json(branding);
  } catch (error) {
    console.error("Branding GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branding settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    console.log("Branding PUT - Full session:", JSON.stringify(session, null, 2));
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Branding PUT - Body:", body);

    const branding = await prisma.systemBranding.upsert({
      where: { id: DEFAULT_BRANDING_ID },
      update: {
        companyName: body.companyName || "Suppo",
        logoUrl: body.logoUrl || null,
        faviconUrl: body.faviconUrl || null,
        primaryColor: body.primaryColor || "#0f172a",
        secondaryColor: body.secondaryColor || "#3b82f6",
        homepageTitle: body.homepageTitle || "Suppo Helpdesk",
        homepageSubtitle: body.homepageSubtitle || "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
        adminPanelTitle: body.adminPanelTitle || "Suppo Admin",
        appTitle: body.appTitle || "고객 지원 센터",
        welcomeMessage: body.welcomeMessage || "무엇을 도와드릴까요?",
        footerText: body.footerText || "© 2026 parkjangwon. All rights reserved.",
        footerPhone: body.footerPhone || null,
        footerEmail: body.footerEmail || null,
        footerHomepage: body.footerHomepage || null,
        footerAddress: body.footerAddress || null,
        showPoweredBy: body.showPoweredBy ?? true,
        knowledgeEnabled: body.knowledgeEnabled ?? true,
        customCss: body.customCss || null,
      },
      create: {
        id: DEFAULT_BRANDING_ID,
        companyName: body.companyName || "Suppo",
        logoUrl: body.logoUrl || null,
        faviconUrl: body.faviconUrl || null,
        primaryColor: body.primaryColor || "#0f172a",
        secondaryColor: body.secondaryColor || "#3b82f6",
        homepageTitle: body.homepageTitle || "Suppo Helpdesk",
        homepageSubtitle: body.homepageSubtitle || "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
        adminPanelTitle: body.adminPanelTitle || "Suppo Admin",
        appTitle: body.appTitle || "고객 지원 센터",
        welcomeMessage: body.welcomeMessage || "무엇을 도와드릴까요?",
        footerText: body.footerText || "© 2026 parkjangwon. All rights reserved.",
        footerPhone: body.footerPhone || null,
        footerEmail: body.footerEmail || null,
        footerHomepage: body.footerHomepage || null,
        footerAddress: body.footerAddress || null,
        showPoweredBy: body.showPoweredBy ?? true,
        knowledgeEnabled: body.knowledgeEnabled ?? true,
        customCss: body.customCss || null,
      },
    });

    return NextResponse.json(branding);
  } catch (error) {
    console.error("Branding PUT error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update branding", details: errorMessage },
      { status: 500 }
    );
  }
}
