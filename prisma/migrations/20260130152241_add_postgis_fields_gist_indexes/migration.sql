/*
  Warnings:

  - You are about to drop the column `getpoint` on the `CustomerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `getpoint` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `getpoint` on the `VendorAddress` table. All the data in the column will be lost.
  - Added the required column `geopoint` to the `CustomerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geopoint` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geopoint` to the `VendorAddress` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_customer_addresses_geo";

-- DropIndex
DROP INDEX "idx_locations_geo";

-- DropIndex
DROP INDEX "idx_vendor_addresses_geo";

-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "getpoint",
ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "getpoint",
ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "getpoint",
ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;
