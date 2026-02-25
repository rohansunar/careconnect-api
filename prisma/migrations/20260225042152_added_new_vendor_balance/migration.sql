-- CreateTable
CREATE TABLE "VendorBalance" (
    "vendorId" TEXT NOT NULL,
    "availableBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBalance_pkey" PRIMARY KEY ("vendorId")
);

-- AddForeignKey
ALTER TABLE "VendorBalance" ADD CONSTRAINT "VendorBalance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
