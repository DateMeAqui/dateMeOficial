-- CreateEnum
CREATE TYPE "public"."gender" AS ENUM ('WOMAN', 'TRANS_WOMAN', 'MAN', 'TRANS_MAN', 'COUPLE_HE_SHE', 'COUPLE_HE_HE', 'COUPLE_SHE_SHE', 'GAY', 'LESBIAN', 'TRAVESTI');

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gender" "public"."gender" NOT NULL,
    "preferences" "public"."gender"[] DEFAULT ARRAY[]::"public"."gender"[],
    "bio" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "public"."profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_gender_idx" ON "public"."profiles"("gender");

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
