-- CreateTable
CREATE TABLE "public"."CompletedTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "taskId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompletedTask_userId_idx" ON "public"."CompletedTask"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletedTask_userId_taskId_key" ON "public"."CompletedTask"("userId", "taskId");

-- AddForeignKey
ALTER TABLE "public"."CompletedTask" ADD CONSTRAINT "CompletedTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
