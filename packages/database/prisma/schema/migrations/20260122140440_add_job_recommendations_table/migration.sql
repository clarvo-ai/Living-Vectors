-- CreateTable
CREATE TABLE "public"."JobRecommendation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRecommendation_userId_idx" ON "public"."JobRecommendation"("userId");

-- CreateIndex
CREATE INDEX "JobRecommendation_jobId_idx" ON "public"."JobRecommendation"("jobId");

-- CreateIndex
CREATE INDEX "JobRecommendation_userId_timestamp_idx" ON "public"."JobRecommendation"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."JobRecommendation" ADD CONSTRAINT "JobRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
