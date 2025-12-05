-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "upiId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_vendorId_idx" ON "BankAccount"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountNumber_key" ON "BankAccount"("accountNumber");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
