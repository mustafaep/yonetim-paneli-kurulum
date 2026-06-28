/*
  Warnings:

  - You are about to drop the column `roles` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "roles";

-- AlterTable
ALTER TABLE "_UserCustomRoles" ADD CONSTRAINT "_UserCustomRoles_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserCustomRoles_AB_unique";
