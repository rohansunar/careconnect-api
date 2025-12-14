/*
  Warnings:

  - You are about to drop the column `bill_id` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `PaymentLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLink" DROP CONSTRAINT "PaymentLink_bill_id_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "bill_id",
ADD COLUMN     "monthlyBillId" TEXT;

-- DropTable
DROP TABLE "PaymentLink";

-- DropEnum
DROP TYPE "PaymentLinkStatus";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_monthlyBillId_fkey" FOREIGN KEY ("monthlyBillId") REFERENCES "MonthlyBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
