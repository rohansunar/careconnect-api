-- AlterTable
ALTER TABLE "VendorBalance" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "VendorBalance_vendorId_idx" ON "VendorBalance"("vendorId");
