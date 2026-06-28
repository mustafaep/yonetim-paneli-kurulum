-- CreateTable: NotificationRecipient
-- This table stores individual recipients for notifications
CREATE TABLE IF NOT EXISTS "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT,
    "memberId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NotificationLog
-- This table stores detailed audit logs for notifications
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "action" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "errorDetails" JSONB,
    "providerResponse" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for NotificationRecipient
CREATE INDEX IF NOT EXISTS "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_memberId_idx" ON "NotificationRecipient"("memberId");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_status_idx" ON "NotificationRecipient"("status");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_channel_idx" ON "NotificationRecipient"("channel");

-- CreateIndexes for NotificationLog
CREATE INDEX IF NOT EXISTS "NotificationLog_notificationId_idx" ON "NotificationLog"("notificationId");
CREATE INDEX IF NOT EXISTS "NotificationLog_recipientId_idx" ON "NotificationLog"("recipientId");
CREATE INDEX IF NOT EXISTS "NotificationLog_channel_idx" ON "NotificationLog"("channel");
CREATE INDEX IF NOT EXISTS "NotificationLog_action_idx" ON "NotificationLog"("action");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- AddForeignKeys for NotificationRecipient
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NotificationRecipient_notificationId_fkey'
    ) THEN
        ALTER TABLE "NotificationRecipient" 
        ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" 
        FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKeys for NotificationLog
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NotificationLog_notificationId_fkey'
    ) THEN
        ALTER TABLE "NotificationLog" 
        ADD CONSTRAINT "NotificationLog_notificationId_fkey" 
        FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NotificationLog_recipientId_fkey'
    ) THEN
        ALTER TABLE "NotificationLog" 
        ADD CONSTRAINT "NotificationLog_recipientId_fkey" 
        FOREIGN KEY ("recipientId") REFERENCES "NotificationRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

