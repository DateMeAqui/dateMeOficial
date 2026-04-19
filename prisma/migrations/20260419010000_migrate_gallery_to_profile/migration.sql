-- DropForeignKey
ALTER TABLE "public"."photos" DROP CONSTRAINT "photos_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."photos" DROP COLUMN "user_id",
ADD COLUMN     "profile_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
