-- CreateTable
CREATE TABLE "GeneralLearning" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneralLearning_userId_idx" ON "GeneralLearning"("userId");

-- AddForeignKey
ALTER TABLE "GeneralLearning" ADD CONSTRAINT "GeneralLearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
