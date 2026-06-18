-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PeladaJoinRequest" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeladaJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeladaJoinRequest_peladaId_status_idx" ON "PeladaJoinRequest"("peladaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PeladaJoinRequest_peladaId_userId_key" ON "PeladaJoinRequest"("peladaId", "userId");

-- AddForeignKey
ALTER TABLE "PeladaJoinRequest" ADD CONSTRAINT "PeladaJoinRequest_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaJoinRequest" ADD CONSTRAINT "PeladaJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

