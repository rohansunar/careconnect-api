/*
  Warnings:

  - You are about to drop the column `geoPoint` on the `CustomerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `geoPoint` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `geoPoint` on the `VendorAddress` table. All the data in the column will be lost.
  - Added the required column `geopoint` to the `CustomerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geopoint` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geopoint` to the `VendorAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "geoPoint",
ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "geoPoint",
ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "geoPoint",
ADD COLUMN     "geopoint" geography(Point,4326) NOT NULL;
