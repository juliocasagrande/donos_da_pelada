-- CreateEnum
CREATE TYPE "MatchKind" AS ENUM ('PELADA', 'AMISTOSO');

-- CreateEnum
CREATE TYPE "PeladaPlan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "kind" "MatchKind" NOT NULL DEFAULT 'PELADA';

-- AlterTable
ALTER TABLE "Pelada" ADD COLUMN     "mpSubscriptionId" TEXT,
ADD COLUMN     "plan" "PeladaPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "proRenewsAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserCareerStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalsTotal" INTEGER NOT NULL DEFAULT 0,
    "presenceTotal" INTEGER NOT NULL DEFAULT 0,
    "craqueTotal" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCareerStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCareerStats_userId_key" ON "UserCareerStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pelada_mpSubscriptionId_key" ON "Pelada"("mpSubscriptionId");

-- AddForeignKey
ALTER TABLE "UserCareerStats" ADD CONSTRAINT "UserCareerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

