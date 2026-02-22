/*
  Warnings:

  - You are about to drop the column `learnedFrom` on the `ConversationMessage` table. All the data in the column will be lost.
  - You are about to drop the `_ConversationMessageToLearning` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `embedding` to the `Learning` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."_ConversationMessageToLearning" DROP CONSTRAINT "_ConversationMessageToLearning_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ConversationMessageToLearning" DROP CONSTRAINT "_ConversationMessageToLearning_B_fkey";

-- AlterTable
ALTER TABLE "public"."ConversationMessage" DROP COLUMN "learnedFrom";

-- AlterTable
ALTER TABLE "public"."Learning" ADD COLUMN     "embedding" vector(768) NOT NULL,
ADD COLUMN     "messages" TEXT[];

-- DropTable
DROP TABLE "public"."_ConversationMessageToLearning";
