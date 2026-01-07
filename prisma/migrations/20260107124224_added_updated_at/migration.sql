/*
  Warnings:

  - Added the required column `updated_at` to the `CustomerAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
