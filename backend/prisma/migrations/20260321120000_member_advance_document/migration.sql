-- AlterTable
ALTER TABLE "MemberAdvance" ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "linkedMemberDocumentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MemberAdvance_linkedMemberDocumentId_key" ON "MemberAdvance"("linkedMemberDocumentId");

-- AddForeignKey
ALTER TABLE "MemberAdvance" ADD CONSTRAINT "MemberAdvance_linkedMemberDocumentId_fkey" FOREIGN KEY ("linkedMemberDocumentId") REFERENCES "MemberDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
