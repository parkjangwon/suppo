import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { DEFAULT_LLM_SETTINGS } from "@/lib/settings/default-llm-settings";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { model, prompt, stream = false } = body;

    if (!model || !prompt) {
      return NextResponse.json(
        { error: "model and prompt are required" },
        { status: 400 }
      );
    }

    const settings = await prisma.lLMSettings.findUnique({
      where: { id: "default" },
    });
    const configuredUrl = settings?.ollamaUrl || DEFAULT_LLM_SETTINGS.ollamaUrl;
    const baseUrl = configuredUrl.endsWith("/") ? configuredUrl.slice(0, -1) : configuredUrl;
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Ollama API error (${response.status}): ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Ollama proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Ollama server" },
      { status: 500 }
    );
  }
}
