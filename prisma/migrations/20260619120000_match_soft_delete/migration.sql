ALTER TABLE "Match" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Match_peladaId_deletedAt_idx" ON "Match"("peladaId", "deletedAt");
