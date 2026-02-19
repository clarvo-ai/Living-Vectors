-- AlterTable: change UserEmbedding.embedding from JSONB to vector(1536)
-- JSONB cannot be cast to vector directly, so we drop and re-add the column.
-- Existing user embeddings will need to be regenerated after this migration.

ALTER TABLE "public"."UserEmbedding" DROP COLUMN "embedding";
ALTER TABLE "public"."UserEmbedding" ADD COLUMN "embedding" vector(1536);
