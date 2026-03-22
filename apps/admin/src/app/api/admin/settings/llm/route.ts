import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { createAuditLog } from "@/lib/audit/logger";
import { DEFAULT_LLM_SETTINGS } from "@/lib/settings/default-llm-settings";

const DEFAULT_SETTINGS_ID = "default";
const MASKED_API_KEY = "****";

function getDefaultSettings() {
  return {
    id: DEFAULT_SETTINGS_ID,
    ...DEFAULT_LLM_SETTINGS,
    hasGeminiApiKey: false,
  };
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.lLMSettings.findUnique({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    if (!settings) {
      return NextResponse.json(getDefaultSettings());
    }

    return NextResponse.json({
      ...settings,
      geminiApiKey: settings.geminiApiKey ? MASKED_API_KEY : "",
      hasGeminiApiKey: !!settings.geminiApiKey,
    });
  } catch (error) {
    console.error("Failed to fetch LLM settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch LLM settings" },
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
    const provider = body.provider === "gemini" ? "gemini" : "ollama";

    const data: Record<string, unknown> = {
      provider,
      ollamaUrl: body.ollamaUrl || DEFAULT_LLM_SETTINGS.ollamaUrl,
      ollamaModel: body.ollamaModel || DEFAULT_LLM_SETTINGS.ollamaModel,
      geminiModel: body.geminiModel || DEFAULT_LLM_SETTINGS.geminiModel,
      analysisEnabled: body.analysisEnabled ?? DEFAULT_LLM_SETTINGS.analysisEnabled,
      analysisPrompt: body.analysisPrompt || null,
    };

    if (typeof body.geminiApiKey === "string" && body.geminiApiKey !== MASKED_API_KEY) {
      data.geminiApiKey = body.geminiApiKey || null;
    }

    const settings = await prisma.lLMSettings.upsert({
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
      resourceType: "llm_settings",
      resourceId: DEFAULT_SETTINGS_ID,
      description: "LLM 설정 변경",
      newValue: {
        provider: settings.provider,
        ollamaModel: settings.ollamaModel,
        geminiModel: settings.geminiModel,
        analysisEnabled: settings.analysisEnabled
      }
    });

    return NextResponse.json({
      ...settings,
      geminiApiKey: settings.geminiApiKey ? MASKED_API_KEY : "",
      hasGeminiApiKey: !!settings.geminiApiKey,
    });
  } catch (error) {
    console.error("Failed to update LLM settings:", error);
    return NextResponse.json(
      { error: "Failed to update LLM settings" },
      { status: 500 }
    );
  }
}
