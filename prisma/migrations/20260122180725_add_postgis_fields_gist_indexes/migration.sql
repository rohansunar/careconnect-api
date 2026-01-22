/*
  Warnings:

  - You are about to drop the column `getpoint` on the `CustomerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `getpoint` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `getpoint` on the `VendorAddress` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_customer_addresses_geo";

-- DropIndex
DROP INDEX "idx_locations_geo";

-- DropIndex
DROP INDEX "idx_vendor_addresses_geo";

-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "getpoint";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "getpoint";

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "getpoint";
