-- CreateTable: UserNotificationSettings
-- This table stores user-specific notification preferences and settings
CREATE TABLE IF NOT EXISTS "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Kanal ayarları
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Saat aralığı (zaman dilimi)
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    
    -- Kategori bazlı ayarlar
    "systemNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "financialNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Tip bazlı ayarlar (JSON - NotificationTypeCategory -> boolean mapping)
    "typeCategorySettings" JSONB,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserNotificationSettings_userId_idx" ON "UserNotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

