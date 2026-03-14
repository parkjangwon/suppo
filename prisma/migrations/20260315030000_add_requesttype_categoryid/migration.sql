-- AlterTable
ALTER TABLE "RequestType" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_categoryId_key" ON "RequestType"("categoryId");

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
