/*
  Warnings:

  - The `payment_mode` column on the `Subscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "payment_mode",
ADD COLUMN     "payment_mode" TEXT NOT NULL DEFAULT 'UPFRONT';

-- DropEnum
DROP TYPE "SubscriptionPaymentMode";
