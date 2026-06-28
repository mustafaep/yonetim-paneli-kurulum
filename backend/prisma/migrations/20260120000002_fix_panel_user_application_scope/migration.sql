-- Fix PanelUserApplicationScope table
-- This table should have been created after PanelUserApplication, but the migration
-- was created earlier. This migration ensures the table exists with correct constraints.

-- Create PanelUserApplicationScope table if it doesn't exist
CREATE TABLE IF NOT EXISTS "PanelUserApplicationScope" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "provinceId" TEXT,
    "districtId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelUserApplicationScope_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "PanelUserApplicationScope_applicationId_idx" ON "PanelUserApplicationScope"("applicationId");
CREATE INDEX IF NOT EXISTS "PanelUserApplicationScope_provinceId_idx" ON "PanelUserApplicationScope"("provinceId");
CREATE INDEX IF NOT EXISTS "PanelUserApplicationScope_districtId_idx" ON "PanelUserApplicationScope"("districtId");

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
    -- NOTE:
    -- The earlier migration `20250120000000_add_role_scope_system` already creates a UNIQUE INDEX with a long name.
    -- In PostgreSQL identifiers are truncated to 63 bytes, so this index name may exist as:
    --   "PanelUserApplicationScope_applicationId_provinceId_districtId_k"
    -- Also, UNIQUE INDEX is NOT stored in pg_constraint unless created via ADD CONSTRAINT.
    -- So we must check pg_class/to_regclass instead of pg_constraint.
    IF to_regclass('"PanelUserApplicationScope_applicationId_provinceId_districtId_key"') IS NULL
       AND to_regclass('"PanelUserApplicationScope_applicationId_provinceId_districtId_k"') IS NULL
       AND to_regclass('"PUAScope_app_prov_dist_uniq"') IS NULL
    THEN
        CREATE UNIQUE INDEX "PUAScope_app_prov_dist_uniq"
        ON "PanelUserApplicationScope"("applicationId", "provinceId", "districtId");
    END IF;
END $$;

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PanelUserApplicationScope_applicationId_fkey'
    ) THEN
        IF to_regclass('"PanelUserApplication"') IS NOT NULL THEN
          ALTER TABLE "PanelUserApplicationScope" 
          ADD CONSTRAINT "PanelUserApplicationScope_applicationId_fkey" 
          FOREIGN KEY ("applicationId") REFERENCES "PanelUserApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PanelUserApplicationScope_provinceId_fkey'
    ) THEN
        ALTER TABLE "PanelUserApplicationScope" 
        ADD CONSTRAINT "PanelUserApplicationScope_provinceId_fkey" 
        FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PanelUserApplicationScope_districtId_fkey'
    ) THEN
        ALTER TABLE "PanelUserApplicationScope" 
        ADD CONSTRAINT "PanelUserApplicationScope_districtId_fkey" 
        FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

