-- AlterTable
ALTER TABLE "GeneralLearning" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "GeneralLearning_userId_sessionId_idx" ON "GeneralLearning"("userId", "sessionId");
