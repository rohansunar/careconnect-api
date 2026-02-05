/*
  Warnings:

  - You are about to drop the column `order_id` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'DELETED';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_order_id_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "order_id";
