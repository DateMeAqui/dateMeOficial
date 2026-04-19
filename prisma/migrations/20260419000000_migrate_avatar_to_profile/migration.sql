-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_avatar_media_id_fkey";

-- DropIndex
DROP INDEX "public"."medias_user_avatar_id_key";

-- DropIndex
DROP INDEX "public"."users_avatar_media_id_key";

-- AlterTable
ALTER TABLE "public"."medias" DROP COLUMN "user_avatar_id",
ADD COLUMN     "profile_avatar_id" TEXT;

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "avatar_media_id" TEXT,
ADD COLUMN     "avatar_url" TEXT;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "avatar_media_id",
DROP COLUMN "avatar_url";

-- CreateIndex
CREATE UNIQUE INDEX "medias_profile_avatar_id_key" ON "public"."medias"("profile_avatar_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_avatar_media_id_key" ON "public"."profiles"("avatar_media_id");

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_avatar_media_id_fkey" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
