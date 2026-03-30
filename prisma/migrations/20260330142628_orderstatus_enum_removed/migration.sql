/*
  Warnings:

  - The values [PAID] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `vendorId` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `customer_id` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `assigned_rider_phone` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `platform_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `product_listing_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `sms_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp_fee` on the `PlatformFee` table. All the data in the column will be lost.
  - You are about to drop the column `deposit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CartItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerAddress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonthlyBill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Rider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vendor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorAddress` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[feeName,categoryId]` on the table `PlatformFee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `BankAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feeType` to the `Ledger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `calculationType` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `effectiveFrom` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feeName` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `PlatformFee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CancellationOrigin" AS ENUM ('CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "FeeCalculationType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "FeeName" AS ENUM ('PRODUCT_LISTING', 'PLATFORM_FEE', 'TRANSACTION_FEE', 'GST', 'DELIVERY_FEE', 'PROCESSING_FEE', 'SERVICE_FEE', 'PACKAGING_FEE');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('ORDER', 'PAYMENT', 'SUBSCRIPTION', 'REFUND', 'BONUS', 'ADJUSTMENT', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "delivery_status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "delivery_status" TYPE "OrderStatus_new" USING ("delivery_status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "delivery_status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "BankAccount" DROP CONSTRAINT "BankAccount_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerAddress" DROP CONSTRAINT "CustomerAddress_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerAddress" DROP CONSTRAINT "CustomerAddress_locationId_fkey";

-- DropForeignKey
ALTER TABLE "Ledger" DROP CONSTRAINT "Ledger_orderItemId_fkey";

-- DropForeignKey
ALTER TABLE "Ledger" DROP CONSTRAINT "Ledger_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyBill" DROP CONSTRAINT "MonthlyBill_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyBill" DROP CONSTRAINT "MonthlyBill_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_addressId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_cartId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Rider" DROP CONSTRAINT "Rider_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_customerAddressId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_productId_fkey";

-- DropForeignKey
ALTER TABLE "VendorAddress" DROP CONSTRAINT "VendorAddress_locationId_fkey";

-- DropForeignKey
ALTER TABLE "VendorAddress" DROP CONSTRAINT "VendorAddress_vendorId_fkey";

-- DropIndex
DROP INDEX "BankAccount_vendorId_idx";

-- DropIndex
DROP INDEX "Product_vendorId_created_at_idx";

-- DropIndex
DROP INDEX "Product_vendorId_idx";

-- DropIndex
DROP INDEX "Product_vendorId_is_active_idx";

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "vendorId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ledger" ADD COLUMN     "deliveryTimestamp" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "feeType" TEXT NOT NULL,
ALTER COLUMN "orderItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "customer_id",
DROP COLUMN "vendor_id",
ADD COLUMN     "userID" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "assigned_rider_phone",
DROP COLUMN "customerId",
ADD COLUMN     "cancellation_origin" "CancellationOrigin",
ADD COLUMN     "riderId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PlatformFee" DROP COLUMN "created_at",
DROP COLUMN "platform_fee",
DROP COLUMN "product_listing_fee",
DROP COLUMN "sms_fee",
DROP COLUMN "transaction_fee",
DROP COLUMN "updated_at",
DROP COLUMN "whatsapp_fee",
ADD COLUMN     "applyOnFeeCode" TEXT,
ADD COLUMN     "calculationType" "FeeCalculationType" NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effectiveFrom" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "effectiveTo" TIMESTAMP(3),
ADD COLUMN     "feeName" "FeeName" NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "deposit",
DROP COLUMN "vendorId",
ADD COLUMN     "subscription_price" DECIMAL(10,2);

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "CartItem";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "CustomerAddress";

-- DropTable
DROP TABLE "Location";

-- DropTable
DROP TABLE "MonthlyBill";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "Rider";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "Vendor";

-- DropTable
DROP TABLE "VendorAddress";

-- DropEnum
DROP TYPE "CartStatus";

-- DropEnum
DROP TYPE "DayOfWeek";

-- DropEnum
DROP TYPE "OperatingDays";

-- DropEnum
DROP TYPE "SubscriptionFrequency";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" "AddressLabel",
    "address" TEXT,
    "pincode" TEXT,
    "geopoint" geography(Point,4326) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "referenceId" TEXT,
    "referenceType" "ReferenceType",
    "description" TEXT,
    "internalNote" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_is_active_idx" ON "Address"("userId", "isDefault", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_eventType_key" ON "PaymentWebhookEvent"("eventId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_status_idx" ON "WalletTransaction"("walletId", "status");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_referenceId_referenceType_idx" ON "WalletTransaction"("referenceId", "referenceType");

-- CreateIndex
CREATE INDEX "WalletTransaction_idempotencyKey_idx" ON "WalletTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_walletId_idempotencyKey_key" ON "WalletTransaction"("walletId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");

-- CreateIndex
CREATE INDEX "Order_riderId_idx" ON "Order"("riderId");

-- CreateIndex
CREATE INDEX "Order_vendorId_delivery_status_idx" ON "Order"("vendorId", "delivery_status");

-- CreateIndex
CREATE INDEX "PlatformFee_categoryId_idx" ON "PlatformFee"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFee_feeName_categoryId_key" ON "PlatformFee"("feeName", "categoryId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
