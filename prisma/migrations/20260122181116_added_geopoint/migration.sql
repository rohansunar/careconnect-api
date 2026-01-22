/*
  Warnings:

  - Added the required column `geoPoint` to the `CustomerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geoPoint` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geoPoint` to the `VendorAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "geoPoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "geoPoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "VendorAddress" ADD COLUMN     "geoPoint" geography(Point,4326) NOT NULL;
