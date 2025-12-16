/*
  Warnings:

  - You are about to drop the column `vendor_id` on the `Rider` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Rider" DROP CONSTRAINT "Rider_vendor_id_fkey";

-- AlterTable
ALTER TABLE "Rider" DROP COLUMN "vendor_id",
ADD COLUMN     "vendorId" TEXT;

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
