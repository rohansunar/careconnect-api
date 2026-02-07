-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('SALE', 'PLATFORM_FEE', 'REFUND', 'PAYOUT');

-- AlterEnum
ALTER TYPE "PaymentMode" ADD VALUE 'SUBSCRIPTION';

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ledger_vendorId_idx" ON "Ledger"("vendorId");

-- CreateIndex
CREATE INDEX "Ledger_orderItemId_idx" ON "Ledger"("orderItemId");

-- CreateIndex
CREATE INDEX "Ledger_type_idx" ON "Ledger"("type");

-- CreateIndex
CREATE INDEX "Ledger_createdAt_idx" ON "Ledger"("createdAt");

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
