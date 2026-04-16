import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { DEFAULT_LLM_SETTINGS } from "@/lib/settings/default-llm-settings";
import {
  generateOllamaText,
  normalizeOllamaBaseUrl,
} from "@/lib/llm/providers/ollama";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { model, prompt } = body;

    if (!model || !prompt) {
      return NextResponse.json(
        { error: "model and prompt are required" },
        { status: 400 }
      );
    }

    const settings = await prisma.lLMSettings.findUnique({
      where: { id: "default" },
    });
    const configuredUrl =
      typeof body.url === "string" && body.url.trim()
        ? body.url.trim()
        : settings?.ollamaUrl || DEFAULT_LLM_SETTINGS.ollamaUrl;
    const result = await generateOllamaText({
      baseUrl: normalizeOllamaBaseUrl(configuredUrl),
      model,
      prompt,
    });

    return NextResponse.json({
      response: result.text,
      model,
      resolvedModel: result.resolvedModel,
    });
  } catch (error) {
    console.error("Ollama proxy error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to Ollama server",
      },
      { status: 500 }
    );
  }
}
