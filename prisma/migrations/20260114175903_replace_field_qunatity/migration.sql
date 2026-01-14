/*
  Warnings:

  - The values [CANCELLED] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `jars_per_delivery` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
ALTER TABLE "public"."Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "public"."SubscriptionStatus_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "jars_per_delivery",
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;
