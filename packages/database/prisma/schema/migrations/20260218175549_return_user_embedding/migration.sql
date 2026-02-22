-- CreateTable
CREATE TABLE "public"."UserEmbedding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "embedding" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmbedding_userId_key" ON "public"."UserEmbedding"("userId");

-- CreateIndex
CREATE INDEX "UserEmbedding_userId_idx" ON "public"."UserEmbedding"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserEmbedding" ADD CONSTRAINT "UserEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
