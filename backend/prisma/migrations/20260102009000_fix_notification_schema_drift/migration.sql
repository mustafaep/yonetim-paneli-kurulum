-- Fix Notification table drift so seed/runtime can write notification fields.
-- Older migrations created "Notification" without newer columns such as category/channels/typeCategory/etc.
-- This migration is safe and idempotent.

DO $$
BEGIN
  -- Ensure enums exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationCategory') THEN
    CREATE TYPE "NotificationCategory" AS ENUM ('SYSTEM', 'FINANCIAL', 'ANNOUNCEMENT', 'REMINDER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
    CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationTypeCategory') THEN
    CREATE TYPE "NotificationTypeCategory" AS ENUM (
      'MEMBER_APPLICATION_NEW',
      'MEMBER_APPLICATION_APPROVED',
      'MEMBER_APPLICATION_REJECTED',
      'ROLE_CHANGED',
      'SCOPE_ASSIGNED',
      'PASSWORD_RESET',
      'ACCOUNT_ACTIVATED',
      'ACCOUNT_DEACTIVATED',
      'DUES_PAYMENT_RECEIVED',
      'DUES_OVERDUE',
      'DUES_BULK_REPORT_READY',
      'ACCOUNTING_APPROVAL_PENDING',
      'ANNOUNCEMENT_GENERAL',
      'ANNOUNCEMENT_REGIONAL',
      'ANNOUNCEMENT_ELECTION',
      'REMINDER_DUES_PAYMENT',
      'REMINDER_DOCUMENT_MISSING',
      'REMINDER_REPRESENTATIVE_TERM_EXPIRING',
      'REMINDER_PENDING_APPROVAL'
    );
  END IF;

  -- Add missing columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Notification'
  ) THEN
    -- category
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'category'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM';
    END IF;

    -- typeCategory
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'typeCategory'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "typeCategory" "NotificationTypeCategory";
    END IF;

    -- channels (enum array)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'channels'
    ) THEN
      ALTER TABLE "Notification"
        ADD COLUMN "channels" "NotificationChannel"[] NOT NULL
        DEFAULT ARRAY['IN_APP']::"NotificationChannel"[];
    END IF;

    -- optional fields used by UI/seed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'targetRole'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "targetRole" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'scheduledFor'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "scheduledFor" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'actionUrl'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "actionUrl" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'actionLabel'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "actionLabel" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'metadata'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "metadata" JSONB;
    END IF;

    -- updatedAt (Prisma uses @updatedAt; on create it is typically set)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'updatedAt'
    ) THEN
      ALTER TABLE "Notification" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      -- Backfill existing rows
      UPDATE "Notification" SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;
    END IF;

    -- Ensure existing rows have category/channels defaults
    UPDATE "Notification" SET "category" = COALESCE("category", 'SYSTEM'::"NotificationCategory");
    UPDATE "Notification" SET "channels" = COALESCE("channels", ARRAY['IN_APP']::"NotificationChannel"[]);
  END IF;
END $$;




























