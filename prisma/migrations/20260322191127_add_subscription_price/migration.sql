/*
  Warnings:

  - You are about to drop the column `deposit` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "deposit",
ADD COLUMN     "subscription_price" DECIMAL(10,2);
