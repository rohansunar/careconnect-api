/*
  Warnings:

  - You are about to drop the column `feeCode` on the `PlatformFee` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[feeName,categoryId]` on the table `PlatformFee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `feeType` to the `Ledger` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `feeName` on the `PlatformFee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "FeeName" AS ENUM ('PRODUCT_LISTING', 'PLATFORM_FEE', 'TRANSACTION_FEE', 'GST', 'DELIVERY_FEE', 'PROCESSING_FEE', 'SERVICE_FEE', 'PACKAGING_FEE');

-- DropIndex
DROP INDEX "PlatformFee_feeCode_idx";

-- AlterTable
ALTER TABLE "Ledger" DROP COLUMN "feeType",
ADD COLUMN     "feeType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PlatformFee" DROP COLUMN "feeCode",
DROP COLUMN "feeName",
ADD COLUMN     "feeName" "FeeName" NOT NULL;

-- DropEnum
DROP TYPE "PlatformFeeType";

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFee_feeName_categoryId_key" ON "PlatformFee"("feeName", "categoryId");
