/*
  Warnings:

  - Made the column `embedding` on table `UserEmbedding` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."UserEmbedding" ALTER COLUMN "embedding" SET NOT NULL;
