/*
  Warnings:

  - You are about to drop the column `comanyId` on the `ApprovalRule` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ApprovalRule` table. All the data in the column will be lost.
  - Added the required column `companyId` to the `ApprovalRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ApprovalRule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ApprovalRule" DROP CONSTRAINT "ApprovalRule_comanyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ApprovalRule" DROP CONSTRAINT "ApprovalRule_userId_fkey";

-- DropIndex
DROP INDEX "public"."ApprovalRule_userId_key";

-- AlterTable
ALTER TABLE "ApprovalRule" DROP COLUMN "comanyId",
DROP COLUMN "userId",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvalRuleId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvalRuleId_fkey" FOREIGN KEY ("approvalRuleId") REFERENCES "ApprovalRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
