/*
  Warnings:

  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserEmbedding` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserEmbedding" DROP CONSTRAINT "UserEmbedding_userId_fkey";

-- DropTable
DROP TABLE "public"."Job";

-- DropTable
DROP TABLE "public"."UserEmbedding";
