/*
  Warnings:

  - You are about to drop the column `gatewayTxnId` on the `VendorPayout` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vendorId,periodStart,periodEnd]` on the table `VendorPayout` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayoutStatus" ADD VALUE 'APPROVED';
ALTER TYPE "PayoutStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "VendorPayout" DROP COLUMN "gatewayTxnId",
ADD COLUMN     "bankReferenceId" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "transferNotes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayout_vendorId_periodStart_periodEnd_key" ON "VendorPayout"("vendorId", "periodStart", "periodEnd");
