import { describe, expect, it } from "vitest";

import { DEFAULT_LLM_SETTINGS } from "@/lib/settings/default-llm-settings";

describe("DEFAULT_LLM_SETTINGS", () => {
  it("uses gemma3:4b as the default Ollama model", () => {
    expect(DEFAULT_LLM_SETTINGS.provider).toBe("ollama");
    expect(DEFAULT_LLM_SETTINGS.ollamaUrl).toBe("http://localhost:11434");
    expect(DEFAULT_LLM_SETTINGS.ollamaModel).toBe("gemma3:4b");
  });
});
