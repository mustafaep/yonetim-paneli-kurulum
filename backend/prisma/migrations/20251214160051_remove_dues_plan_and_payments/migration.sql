/*
  Warnings:

  - You are about to drop the column `duesPlanId` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the `DuesPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DuesPlan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DuesPayment" DROP CONSTRAINT "DuesPayment_memberId_fkey";

-- DropForeignKey
ALTER TABLE "DuesPayment" DROP CONSTRAINT "DuesPayment_planId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_duesPlanId_fkey";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "duesPlanId";

-- DropTable
DROP TABLE "DuesPayment";

-- DropTable
DROP TABLE "DuesPlan";

-- DropEnum
DROP TYPE "DuesPeriod";
