/*
  Warnings:

  - You are about to drop the column `owner_name` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "owner_name",
ADD COLUMN     "business_name" TEXT;
