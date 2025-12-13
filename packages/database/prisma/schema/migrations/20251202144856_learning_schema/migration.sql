-- CreateTable
CREATE TABLE "Learning" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConversationMessageToLearning" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ConversationMessageToLearning_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Learning_userId_idx" ON "Learning"("userId");

-- CreateIndex
CREATE INDEX "_ConversationMessageToLearning_B_index" ON "_ConversationMessageToLearning"("B");

-- AddForeignKey
ALTER TABLE "Learning" ADD CONSTRAINT "Learning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationMessageToLearning" ADD CONSTRAINT "_ConversationMessageToLearning_A_fkey" FOREIGN KEY ("A") REFERENCES "ConversationMessage"("messageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationMessageToLearning" ADD CONSTRAINT "_ConversationMessageToLearning_B_fkey" FOREIGN KEY ("B") REFERENCES "Learning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
