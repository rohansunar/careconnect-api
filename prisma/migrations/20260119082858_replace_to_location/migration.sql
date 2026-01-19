/*
  Warnings:

  - You are about to drop the column `cityId` on the `CustomerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `cityId` on the `VendorAddress` table. All the data in the column will be lost.
  - You are about to drop the `City` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomerAddress" DROP CONSTRAINT "CustomerAddress_cityId_fkey";

-- DropForeignKey
ALTER TABLE "VendorAddress" DROP CONSTRAINT "VendorAddress_cityId_fkey";

-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "cityId",
ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "cityId",
ADD COLUMN     "locationId" TEXT;

-- DropTable
DROP TABLE "City";

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "isServiceable" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "serviceRadiusKm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- CreateIndex
CREATE INDEX "Product_is_active_idx" ON "Product"("is_active");

-- CreateIndex
CREATE INDEX "Product_created_at_idx" ON "Product"("created_at");

-- CreateIndex
CREATE INDEX "Product_vendorId_is_active_idx" ON "Product"("vendorId", "is_active");

-- CreateIndex
CREATE INDEX "Product_vendorId_created_at_idx" ON "Product"("vendorId", "created_at");

-- CreateIndex
CREATE INDEX "VendorAddress_lat_lng_idx" ON "VendorAddress"("lat", "lng");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAddress" ADD CONSTRAINT "VendorAddress_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
