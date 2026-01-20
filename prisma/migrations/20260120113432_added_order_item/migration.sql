/*
  Warnings:

  - You are about to drop the column `customer_id` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `VendorAddress` table. All the data in the column will be lost.
  - Added the required column `billing_period_end` to the `MonthlyBill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billing_period_start` to the `MonthlyBill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_mode` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONLINE', 'COD', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ProductApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_vendor_id_fkey";

-- AlterTable
ALTER TABLE "Categories" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "country" SET DEFAULT 'India',
ALTER COLUMN "lat" SET DEFAULT 0.0,
ALTER COLUMN "lng" SET DEFAULT 0.0,
ALTER COLUMN "serviceRadiusKm" SET DEFAULT 50;

-- AlterTable
ALTER TABLE "MonthlyBill" ADD COLUMN     "billing_period_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "billing_period_start" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "delivery_otp" TEXT,
ADD COLUMN     "otp_generated_at" TIMESTAMP(3),
ADD COLUMN     "otp_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_mode" "PaymentMode" NOT NULL,
ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "customer_id",
DROP COLUMN "vendor_id";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "approval_status" "ProductApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "is_schedulable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VendorAddress" DROP COLUMN "state";

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "deposit" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "product_listing_fee" DECIMAL NOT NULL DEFAULT 5.00,
    "platform_fee" DECIMAL(8,2) NOT NULL DEFAULT 5.00,
    "transaction_fee" DECIMAL(8,2) NOT NULL DEFAULT 2.00,
    "sms_fee" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "whatsapp_fee" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFee" ADD CONSTRAINT "PlatformFee_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
