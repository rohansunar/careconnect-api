/*
  Warnings:

  - The values [Restaurant,Shop,Institution] on the enum `AddressLabel` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Ledger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AddressLabel_new" AS ENUM ('Home', 'Office', 'Clinic', 'Hospital');
ALTER TABLE "Address" ALTER COLUMN "label" TYPE "AddressLabel_new" USING ("label"::text::"AddressLabel_new");
ALTER TYPE "AddressLabel" RENAME TO "AddressLabel_old";
ALTER TYPE "AddressLabel_new" RENAME TO "AddressLabel";
DROP TYPE "public"."AddressLabel_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_paymentId_fkey";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "country" TEXT,
ADD COLUMN     "state" TEXT;

-- DropTable
DROP TABLE "Ledger";

-- DropTable
DROP TABLE "Order";

-- DropEnum
DROP TYPE "CancellationOrigin";

-- DropEnum
DROP TYPE "LedgerType";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "PaymentMode";
