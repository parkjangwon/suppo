import type { LLMSettings } from "@prisma/client";
import { prisma } from "@crinity/db";
import { callGemini } from "@/lib/llm/providers/gemini";
import { callOllama } from "@/lib/llm/providers/ollama";

export interface AuditLogEntry {
  actorName: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  createdAt: string;
}

async function getLlmSettings(): Promise<LLMSettings> {
  return prisma.lLMSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

async function runProvider(prompt: string, settings: LLMSettings): Promise<string> {
  const provider = settings.provider.trim().toLowerCase();
  if (provider === "ollama") return callOllama(prompt, settings);
  if (provider === "gemini") return callGemini(prompt, settings);
  throw new Error(`지원하지 않는 LLM provider: ${settings.provider}`);
}

function buildPrompt(logs: AuditLogEntry[]): string {
  const logText = logs.map((l) =>
    `[${l.createdAt}] ${l.actorName}(${l.actorEmail}) — ${l.action} ${l.resourceType}${l.resourceId ? " " + l.resourceId : ""}: ${l.description}`
  ).join("\n");

  return `당신은 보안 감사 전문가입니다. 아래 시스템 감사 로그를 분석하여 이상 패턴을 탐지해주세요.

=== 감사 로그 (최대 100건) ===
${logText}

=== 탐지 기준 ===
- 짧은 시간 내 동일 행위자의 대량 액션 (5건 이상/10분)
- 비업무 시간대(새벽 0~6시) 집중 활동
- 반복적인 삭제 또는 권한 변경
- 동일 리소스에 대한 반복 접근
- 기타 비정상적으로 보이는 패턴

=== 요청사항 ===
- 이상 패턴이 있으면 구체적으로 설명하세요 (누가, 언제, 무엇을, 왜 의심스러운지).
- 이상 패턴이 없으면 "특이 패턴이 감지되지 않았습니다."라고만 작성하세요.
- 마크다운 없이 평문으로 작성하세요.
- 한국어로 작성하세요.

분석 결과:`;
}

export async function generateAuditAnomalyReport(
  logs: AuditLogEntry[]
): Promise<string | null> {
  const settings = await getLlmSettings();
  if (!settings.analysisEnabled) return null;
  try {
    return (await runProvider(buildPrompt(logs), settings)).trim();
  } catch (error) {
    console.error("generateAuditAnomalyReport failed:", error);
    return null;
  }
}
