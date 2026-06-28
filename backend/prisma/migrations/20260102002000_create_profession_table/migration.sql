-- CreateTable
-- Some environments may mark older (2025-01) migrations as applied without executing them.
-- Ensure the Profession table exists for seed/runtime.
CREATE TABLE IF NOT EXISTS "Profession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profession_name_key" ON "Profession"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Profession_isActive_idx" ON "Profession"("isActive");


