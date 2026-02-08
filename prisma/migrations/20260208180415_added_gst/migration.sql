-- AlterTable
ALTER TABLE "PlatformFee" ADD COLUMN     "gst" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
ALTER COLUMN "product_listing_fee" SET DEFAULT 10.00,
ALTER COLUMN "transaction_fee" SET DEFAULT 2.50;
