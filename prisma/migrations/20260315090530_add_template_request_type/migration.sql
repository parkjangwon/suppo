-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResponseTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "categoryId" TEXT,
    "requestTypeId" TEXT,
    "createdById" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResponseTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResponseTemplate_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResponseTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ResponseTemplate" ("categoryId", "content", "createdAt", "createdById", "id", "isShared", "sortOrder", "title", "updatedAt", "variables") SELECT "categoryId", "content", "createdAt", "createdById", "id", "isShared", "sortOrder", "title", "updatedAt", "variables" FROM "ResponseTemplate";
DROP TABLE "ResponseTemplate";
ALTER TABLE "new_ResponseTemplate" RENAME TO "ResponseTemplate";
CREATE INDEX "ResponseTemplate_categoryId_idx" ON "ResponseTemplate"("categoryId");
CREATE INDEX "ResponseTemplate_requestTypeId_idx" ON "ResponseTemplate"("requestTypeId");
CREATE INDEX "ResponseTemplate_createdById_idx" ON "ResponseTemplate"("createdById");
CREATE INDEX "ResponseTemplate_sortOrder_idx" ON "ResponseTemplate"("sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
