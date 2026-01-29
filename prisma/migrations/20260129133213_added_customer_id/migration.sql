/*
  Warnings:

  - Made the column `customerId` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vendorId` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `addressId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_addressId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vendorId_fkey";

-- DropIndex
DROP INDEX "Subscription_customerAddressId_idx";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "customerId" SET NOT NULL,
ALTER COLUMN "vendorId" SET NOT NULL,
ALTER COLUMN "addressId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CustomerAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
