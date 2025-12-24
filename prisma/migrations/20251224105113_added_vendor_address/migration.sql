/*
  Warnings:

  - You are about to drop the column `address` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `cityId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_time_msg` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `pincode` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `service_radius_m` on the `Vendor` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_cityId_fkey";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "address",
DROP COLUMN "cityId",
DROP COLUMN "delivery_time_msg",
DROP COLUMN "location",
DROP COLUMN "pincode",
DROP COLUMN "service_radius_m";

-- CreateTable
CREATE TABLE "VendorAddress" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "service_radius_m" INTEGER,
    "delivery_time_msg" TEXT,
    "street" TEXT,
    "cityId" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "location" TEXT,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorAddress_vendorId_key" ON "VendorAddress"("vendorId");

-- AddForeignKey
ALTER TABLE "VendorAddress" ADD CONSTRAINT "VendorAddress_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAddress" ADD CONSTRAINT "VendorAddress_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
