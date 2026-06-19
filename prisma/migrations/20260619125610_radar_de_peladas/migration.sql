-- CreateEnum
CREATE TYPE "GuestPosition" AS ENUM ('LINHA', 'GOLEIRO');

-- CreateEnum
CREATE TYPE "GuestFeeMode" AS ENUM ('FREE', 'CHARGE', 'PAY');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "guestGoalkeeperFeeAmount" DOUBLE PRECISION,
ADD COLUMN     "guestGoalkeeperFeeMode" "GuestFeeMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "guestGoalkeeperSlots" INTEGER,
ADD COLUMN     "guestLatitude" DOUBLE PRECISION,
ADD COLUMN     "guestLineFeeAmount" DOUBLE PRECISION,
ADD COLUMN     "guestLineFeeMode" "GuestFeeMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "guestLineSlots" INTEGER,
ADD COLUMN     "guestLongitude" DOUBLE PRECISION,
ADD COLUMN     "guestMaxRating" DOUBLE PRECISION,
ADD COLUMN     "guestMinRating" DOUBLE PRECISION,
ADD COLUMN     "openToGuests" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "radarEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "radarRadiusKm" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "MatchGuestRequest" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" "GuestPosition" NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchGuestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchGuestRequest_matchId_status_idx" ON "MatchGuestRequest"("matchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MatchGuestRequest_matchId_userId_key" ON "MatchGuestRequest"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "MatchGuestRequest" ADD CONSTRAINT "MatchGuestRequest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGuestRequest" ADD CONSTRAINT "MatchGuestRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
