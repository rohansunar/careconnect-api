/*
  Warnings:

  - Added the required column `categoryID` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "categoryID" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hasActivePlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "radiusKm" INTEGER NOT NULL DEFAULT 5;
