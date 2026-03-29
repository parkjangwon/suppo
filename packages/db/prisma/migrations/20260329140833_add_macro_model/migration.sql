-- CreateTable
CREATE TABLE "Macro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "category" TEXT NOT NULL,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Macro_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Macro_createdById_idx" ON "Macro"("createdById");

-- CreateIndex
CREATE INDEX "Macro_shortcut_idx" ON "Macro"("shortcut");

-- CreateIndex
CREATE INDEX "Macro_isPersonal_idx" ON "Macro"("isPersonal");

-- CreateIndex
CREATE INDEX "Macro_category_idx" ON "Macro"("category");
