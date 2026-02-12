/*
  Warnings:

  - You are about to drop the column `assigned_rider_phone` on the `Order` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CancellationOrigin" AS ENUM ('CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "assigned_rider_phone",
ADD COLUMN     "cancellation_origin" "CancellationOrigin",
ADD COLUMN     "rider_id" TEXT;

-- CreateIndex
CREATE INDEX "Order_rider_id_idx" ON "Order"("rider_id");

-- CreateIndex
CREATE INDEX "Order_vendorId_delivery_status_idx" ON "Order"("vendorId", "delivery_status");

-- CreateIndex
CREATE INDEX "Rider_vendorId_idx" ON "Rider"("vendorId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
