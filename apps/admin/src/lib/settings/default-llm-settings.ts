export const DEFAULT_LLM_SETTINGS = {
  provider: "ollama",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "gemma3:4b",
  geminiApiKey: "",
  geminiModel: "gemini-1.5-flash",
  analysisEnabled: false,
  analysisPrompt: "",
} as const;
