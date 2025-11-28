-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "delivery_time_msg" TEXT,
ADD COLUMN     "is_available_today" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "service_radius_m" INTEGER;
