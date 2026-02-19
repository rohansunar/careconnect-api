/*
  Warnings:

  - You are about to drop the column `rider_id` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_rider_id_fkey";

-- DropIndex
DROP INDEX "Order_rider_id_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "rider_id",
ADD COLUMN     "riderId" TEXT;

-- CreateIndex
CREATE INDEX "Order_riderId_idx" ON "Order"("riderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
