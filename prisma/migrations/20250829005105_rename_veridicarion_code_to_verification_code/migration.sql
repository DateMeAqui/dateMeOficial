/*
  Warnings:

  - You are about to drop the column `veridicarionCode` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "veridicarionCode",
ADD COLUMN     "veridicationCode" INTEGER;
