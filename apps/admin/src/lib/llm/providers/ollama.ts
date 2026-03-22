import type { LLMSettings } from "@prisma/client";

interface OllamaGenerateResponse {
  response?: string;
}

function isRunningOnServer(): boolean {
  return typeof window === "undefined";
}

function normalizeOllamaBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function callOllamaDirect(prompt: string, settings: LLMSettings): Promise<string> {
  const baseUrl = normalizeOllamaBaseUrl(settings.ollamaUrl);
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.ollamaModel,
      prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama API 요청 실패 (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as OllamaGenerateResponse;
  const generatedText = payload.response?.trim();

  if (!generatedText) {
    throw new Error("Ollama API 응답에 생성 텍스트가 없습니다.");
  }

  return generatedText;
}

async function callOllamaViaProxy(prompt: string, settings: LLMSettings): Promise<string> {
  const response = await fetch("/api/llm/ollama", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: settings.ollamaUrl,
      model: settings.ollamaModel,
      prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API 요청 실패 (${response.status}): ${error}`);
  }

  const payload = (await response.json()) as OllamaGenerateResponse;
  const generatedText = payload.response?.trim();

  if (!generatedText) {
    throw new Error("Ollama API 응답에 생성 텍스트가 없습니다.");
  }

  return generatedText;
}

export async function callOllama(prompt: string, settings: LLMSettings): Promise<string> {
  if (isRunningOnServer()) {
    return callOllamaDirect(prompt, settings);
  } else {
    return callOllamaViaProxy(prompt, settings);
  }
}
