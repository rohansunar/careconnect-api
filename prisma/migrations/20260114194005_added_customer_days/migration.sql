/*
  Warnings:

  - Changed the type of `frequency` on the `Subscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('DAILY', 'ALTERNATIVE_DAYS', 'CUSTOM_DAYS');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "custom_days" "DayOfWeek"[],
DROP COLUMN "frequency",
ADD COLUMN     "frequency" "SubscriptionFrequency" NOT NULL;
