-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LLMSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "ollamaUrl" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "ollamaModel" TEXT NOT NULL DEFAULT 'gemma3:4b',
    "geminiApiKey" TEXT,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "analysisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "analysisPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LLMSettings" ("analysisEnabled", "analysisPrompt", "createdAt", "geminiApiKey", "geminiModel", "id", "ollamaModel", "ollamaUrl", "provider", "updatedAt") SELECT "analysisEnabled", "analysisPrompt", "createdAt", "geminiApiKey", "geminiModel", "id", "ollamaModel", "ollamaUrl", "provider", "updatedAt" FROM "LLMSettings";
DROP TABLE "LLMSettings";
ALTER TABLE "new_LLMSettings" RENAME TO "LLMSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
