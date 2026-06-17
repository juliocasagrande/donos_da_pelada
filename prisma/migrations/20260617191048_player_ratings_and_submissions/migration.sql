-- CreateTable
CREATE TABLE "PlayerMatchSubmission" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMatchSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchSubmission_matchId_playerId_userId_key" ON "PlayerMatchSubmission"("matchId", "playerId", "userId");

-- AddForeignKey
ALTER TABLE "PlayerMatchSubmission" ADD CONSTRAINT "PlayerMatchSubmission_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchSubmission" ADD CONSTRAINT "PlayerMatchSubmission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchSubmission" ADD CONSTRAINT "PlayerMatchSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
