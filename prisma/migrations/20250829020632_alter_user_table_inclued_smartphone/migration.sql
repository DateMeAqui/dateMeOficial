/*
  Warnings:

  - Added the required column `smartphone` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `veridicationCode` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "smartphone" TEXT NOT NULL,
ALTER COLUMN "deleted_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL,
ALTER COLUMN "isOnline" DROP NOT NULL,
ALTER COLUMN "veridicationCode" SET NOT NULL;
