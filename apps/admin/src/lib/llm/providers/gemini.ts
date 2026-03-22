import type { LLMSettings } from "@prisma/client";

interface GeminiCandidatePart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiCandidatePart[];
  };
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
}

function buildGeminiUrl(settings: LLMSettings): string {
  if (!settings.geminiApiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const apiKey = encodeURIComponent(settings.geminiApiKey);
  const model = encodeURIComponent(settings.geminiModel);
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export async function callGemini(prompt: string, settings: LLMSettings): Promise<string> {
  const response = await fetch(buildGeminiUrl(settings), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    }),
    signal: AbortSignal.timeout(60_000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API 요청 실패 (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const generatedText = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!generatedText) {
    throw new Error("Gemini API 응답에 생성 텍스트가 없습니다.");
  }

  return generatedText;
}
