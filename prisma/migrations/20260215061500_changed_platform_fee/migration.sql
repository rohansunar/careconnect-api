/*
  Warnings:

  - You are about to drop the column `created_at` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `gst` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `platform_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `product_listing_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `PlatformFee` table. All the data in the column will be lost.
  - Added the required column `calculationType` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `effectiveFrom` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feeCode` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feeName` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeeCalculationType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "PlatformFee" DROP COLUMN "created_at",
DROP COLUMN "gst",
DROP COLUMN "platform_fee",
DROP COLUMN "product_listing_fee",
DROP COLUMN "transaction_fee",
DROP COLUMN "updated_at",
ADD COLUMN     "applyOnFeeCode" TEXT,
ADD COLUMN     "calculationType" "FeeCalculationType" NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effectiveFrom" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "effectiveTo" TIMESTAMP(3),
ADD COLUMN     "feeCode" TEXT NOT NULL,
ADD COLUMN     "feeName" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" DECIMAL(10,2) NOT NULL;

-- CreateIndex
CREATE INDEX "PlatformFee_categoryId_idx" ON "PlatformFee"("categoryId");

-- CreateIndex
CREATE INDEX "PlatformFee_feeCode_idx" ON "PlatformFee"("feeCode");
