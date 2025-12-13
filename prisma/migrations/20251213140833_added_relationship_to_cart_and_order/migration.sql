/*
  Warnings:

  - You are about to drop the column `address_id` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customer_id` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_address_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_product_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vendor_id_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "address_id",
DROP COLUMN "customer_id",
DROP COLUMN "product_id",
DROP COLUMN "qty",
DROP COLUMN "vendor_id",
ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "cartId" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
