-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "isCritical" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemSetting_isCritical_idx" ON "SystemSetting"("isCritical");

