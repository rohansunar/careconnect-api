/*
  Warnings:

  - You are about to drop the column `location` on the `CustomerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `service_radius_m` on the `VendorAddress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "location",
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "service_radius_m";
