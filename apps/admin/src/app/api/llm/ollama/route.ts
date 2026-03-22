import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, model, prompt, stream = false } = body;

    if (!url || !model || !prompt) {
      return NextResponse.json(
        { error: "url, model, prompt are required" },
        { status: 400 }
      );
    }

    const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    
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
