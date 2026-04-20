import { prisma } from "@suppo/db";

export async function getAnalysisEnabled(): Promise<boolean> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return false;
  }

  try {
    const llmSettings = await prisma.lLMSettings.findFirst();
    return llmSettings?.analysisEnabled ?? false;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2021") {
      return false;
    }
    throw error;
  }
}
