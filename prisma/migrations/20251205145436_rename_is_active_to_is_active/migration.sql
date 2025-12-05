-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
