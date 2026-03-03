/*
  Warnings:

  - You are about to alter the column `total_price` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `price_snapshot` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "total_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "price_snapshot" SET DATA TYPE DECIMAL(12,2);
