-- AlterTable
ALTER TABLE "Match" ADD COLUMN "opponentName" TEXT;
ALTER TABLE "Match" ADD COLUMN "homeScore" INTEGER;
ALTER TABLE "Match" ADD COLUMN "awayScore" INTEGER;
ALTER TABLE "Match" ADD COLUMN "closeReminderSentAt" TIMESTAMP(3);
