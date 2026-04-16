import type { LLMSettings } from "@prisma/client";

interface OllamaGenerateResponse {
  response?: string;
}

interface OllamaTagResponse {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

interface GenerateOllamaTextOptions {
  baseUrl: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}

function isRunningOnServer(): boolean {
  return typeof window === "undefined";
}

export function normalizeOllamaBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function isMissingModelError(status: number, text: string): boolean {
  return (status === 400 || status === 404) && /model .* not found/i.test(text);
}

async function listAvailableOllamaModels(
  baseUrl: string,
  signal: AbortSignal,
): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/tags`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama 모델 목록 조회 실패 (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as OllamaTagResponse;
  const models = payload.models
    ?.map((entry) => entry.name ?? entry.model ?? "")
    .map((name) => name.trim())
    .filter(Boolean) ?? [];

  return Array.from(new Set(models));
}

async function requestOllamaGenerate(
  baseUrl: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
) {
  return fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
    signal,
  });
}

async function resolveOllamaModel(
  baseUrl: string,
  requestedModel: string,
  signal: AbortSignal,
): Promise<string> {
  const availableModels = await listAvailableOllamaModels(baseUrl, signal);

  if (availableModels.includes(requestedModel)) {
    return requestedModel;
  }

  if (availableModels.length === 1) {
    return availableModels[0];
  }

  const availableLabel =
    availableModels.length > 0 ? availableModels.join(", ") : "없음";

  throw new Error(
    `Ollama 모델 '${requestedModel}'을 찾을 수 없습니다. 사용 가능한 모델: ${availableLabel}`,
  );
}

export async function generateOllamaText({
  baseUrl,
  model,
  prompt,
  signal = AbortSignal.timeout(60_000),
}: GenerateOllamaTextOptions): Promise<{ text: string; resolvedModel: string }> {
  const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl);
  const requestedModel = model.trim();

  if (!requestedModel) {
    throw new Error("Ollama 모델명이 비어 있습니다.");
  }

  let resolvedModel = requestedModel;
  let response = await requestOllamaGenerate(
    normalizedBaseUrl,
    resolvedModel,
    prompt,
    signal,
  );

  if (!response.ok) {
    const text = await response.text();

    if (isMissingModelError(response.status, text)) {
      resolvedModel = await resolveOllamaModel(
        normalizedBaseUrl,
        requestedModel,
        signal,
      );
      response = await requestOllamaGenerate(
        normalizedBaseUrl,
        resolvedModel,
        prompt,
        signal,
      );
    } else {
      throw new Error(`Ollama API 요청 실패 (${response.status}): ${text}`);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama API 요청 실패 (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as OllamaGenerateResponse;
  const generatedText = payload.response?.trim();

  if (!generatedText) {
    throw new Error("Ollama API 응답에 생성 텍스트가 없습니다.");
  }

  return {
    text: generatedText,
    resolvedModel,
  };
}

async function callOllamaDirect(
  prompt: string,
  settings: LLMSettings,
): Promise<string> {
  const result = await generateOllamaText({
    baseUrl: settings.ollamaUrl,
    model: settings.ollamaModel,
    prompt,
  });

  return result.text;
}

async function callOllamaViaProxy(
  prompt: string,
  settings: LLMSettings,
): Promise<string> {
  const response = await fetch("/api/llm/ollama", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: settings.ollamaUrl,
      model: settings.ollamaModel,
      prompt,
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

export async function callOllama(
  prompt: string,
  settings: LLMSettings,
): Promise<string> {
  if (isRunningOnServer()) {
    return callOllamaDirect(prompt, settings);
  }

  return callOllamaViaProxy(prompt, settings);
}
