/*
  Warnings:

  - The values [WHATSAPP_FEE,SMS_FEE] on the enum `PlatformFeeType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sms_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp_fee` on the `PlatformFee` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlatformFeeType_new" AS ENUM ('LISTING_FEE', 'PAYMENT_GATEWAY_FEE', 'GST', 'ADJUSTMENT', 'SALE', 'PAYOUT');
ALTER TABLE "Ledger" ALTER COLUMN "feeType" TYPE "PlatformFeeType_new" USING ("feeType"::text::"PlatformFeeType_new");
ALTER TYPE "PlatformFeeType" RENAME TO "PlatformFeeType_old";
ALTER TYPE "PlatformFeeType_new" RENAME TO "PlatformFeeType";
DROP TYPE "public"."PlatformFeeType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Ledger" ADD COLUMN     "deliveryTimestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformFee" DROP COLUMN "sms_fee",
DROP COLUMN "whatsapp_fee";
