CREATE TABLE "SeasonPlayerStat" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "presence" INTEGER NOT NULL DEFAULT 0,
    "craque" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonPlayerStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonPlayerStat_peladaId_playerId_year_key" ON "SeasonPlayerStat"("peladaId", "playerId", "year");
CREATE INDEX "SeasonPlayerStat_playerId_idx" ON "SeasonPlayerStat"("playerId");
CREATE INDEX "SeasonPlayerStat_peladaId_year_idx" ON "SeasonPlayerStat"("peladaId", "year");

ALTER TABLE "SeasonPlayerStat" ADD CONSTRAINT "SeasonPlayerStat_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonPlayerStat" ADD CONSTRAINT "SeasonPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;