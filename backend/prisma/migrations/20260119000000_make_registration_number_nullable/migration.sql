-- AlterTable
-- Make registrationNumber nullable (will be assigned during approval)
-- PostgreSQL allows multiple NULL values in UNIQUE constraints, so we can just drop NOT NULL
ALTER TABLE "Member" ALTER COLUMN "registrationNumber" DROP NOT NULL;
