/*
  Warnings:

  - You are about to drop the column `delivery_time_msg` on the `VendorAddress` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `VendorAddress` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `VendorAddress` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `VendorAddress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "delivery_time_msg",
DROP COLUMN "location",
DROP COLUMN "street",
DROP COLUMN "zipCode",
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "pincode" TEXT;

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_isDefault_idx" ON "CustomerAddress"("customerId", "isDefault");
