/*
  Warnings:

  - You are about to drop the column `vendorId` on the `Subscription` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_vendorId_fkey";

-- DropIndex
DROP INDEX "Subscription_vendorId_idx";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "vendorId",
ADD COLUMN     "price_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 0;
