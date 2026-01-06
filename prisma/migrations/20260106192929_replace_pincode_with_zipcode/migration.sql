/*
  Warnings:

  - You are about to drop the column `isActive` on the `CustomerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `pincode` on the `CustomerAddress` table. All the data in the column will be lost.
  - The `label` column on the `CustomerAddress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `country` on the `VendorAddress` table. All the data in the column will be lost.
  - Made the column `address` on table `VendorAddress` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AddressLabel" AS ENUM ('Home', 'Office', 'Restaurant', 'Shop', 'Institution');

-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "isActive",
DROP COLUMN "pincode",
ADD COLUMN     "location" JSONB,
ADD COLUMN     "zipCode" TEXT,
DROP COLUMN "label",
ADD COLUMN     "label" "AddressLabel";

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "country",
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "address" SET DATA TYPE TEXT;
