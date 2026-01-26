/*
  Warnings:

  - Added the required column `geopoint` to the `CustomerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geopoint` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geopoint` to the `VendorAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "VendorAddress" ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;
