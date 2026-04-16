/*
  Warnings:

  - You are about to drop the column `receiptId` on the `payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."payments" DROP COLUMN "receiptId";
