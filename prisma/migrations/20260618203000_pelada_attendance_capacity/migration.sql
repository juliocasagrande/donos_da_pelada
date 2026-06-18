ALTER TABLE "Pelada"
ADD COLUMN "maxLinePlayers" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN "maxGoalkeepers" INTEGER NOT NULL DEFAULT 2;

ALTER TABLE "Pelada"
ADD CONSTRAINT "Pelada_maxLinePlayers_positive" CHECK ("maxLinePlayers" > 0),
ADD CONSTRAINT "Pelada_maxGoalkeepers_nonnegative" CHECK ("maxGoalkeepers" >= 0);
