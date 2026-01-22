-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "openingTime" SET DEFAULT '09:00',
ALTER COLUMN "closingTime" SET DEFAULT '20:00',
ALTER COLUMN "operatingDays" SET DEFAULT ARRAY[]::"OperatingDays"[];
