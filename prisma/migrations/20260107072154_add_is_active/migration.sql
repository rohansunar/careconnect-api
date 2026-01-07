-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
