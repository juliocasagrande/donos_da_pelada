-- CreateEnum
CREATE TYPE "MatchSurface" AS ENUM ('SOCIETY', 'CAMPO', 'QUADRA');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "location" TEXT,
ADD COLUMN     "surface" "MatchSurface" NOT NULL DEFAULT 'SOCIETY';
