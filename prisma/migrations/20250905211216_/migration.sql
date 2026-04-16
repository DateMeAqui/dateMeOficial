-- DropForeignKey
ALTER TABLE "public"."addresses" DROP CONSTRAINT "addresses_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
