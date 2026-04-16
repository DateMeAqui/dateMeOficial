/*
  Warnings:

  - You are about to drop the column `veridicationCode` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "veridicationCode",
ADD COLUMN     "verificationCode" INTEGER;
