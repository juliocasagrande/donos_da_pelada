-- CreateEnum
CREATE TYPE "PeladaRole" AS ENUM ('PRESIDENTE', 'ADMIN', 'JOGADOR');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "peladaId" TEXT;

-- AlterTable
ALTER TABLE "MonthlyFeeConfig" ADD COLUMN     "peladaId" TEXT;

-- AlterTable
ALTER TABLE "MonthlyPayment" ADD COLUMN     "peladaId" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "peladaId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "peladaId" TEXT;

-- CreateTable
CREATE TABLE "Pelada" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pelada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeladaMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "role" "PeladaRole" NOT NULL DEFAULT 'JOGADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeladaMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeladaInvite" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "PeladaRole" NOT NULL DEFAULT 'JOGADOR',
    "createdByUserId" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeladaInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pelada_slug_key" ON "Pelada"("slug");

-- CreateIndex
CREATE INDEX "PeladaMembership_peladaId_idx" ON "PeladaMembership"("peladaId");

-- CreateIndex
CREATE UNIQUE INDEX "PeladaMembership_userId_peladaId_key" ON "PeladaMembership"("userId", "peladaId");

-- CreateIndex
CREATE UNIQUE INDEX "PeladaInvite_code_key" ON "PeladaInvite"("code");

-- CreateIndex
CREATE INDEX "PeladaInvite_peladaId_idx" ON "PeladaInvite"("peladaId");

-- CreateIndex
CREATE INDEX "Match_peladaId_idx" ON "Match"("peladaId");

-- CreateIndex
CREATE INDEX "MonthlyFeeConfig_peladaId_idx" ON "MonthlyFeeConfig"("peladaId");

-- CreateIndex
CREATE INDEX "MonthlyPayment_peladaId_idx" ON "MonthlyPayment"("peladaId");

-- CreateIndex
CREATE INDEX "Player_peladaId_idx" ON "Player"("peladaId");

-- CreateIndex
CREATE INDEX "Transaction_peladaId_idx" ON "Transaction"("peladaId");

-- AddForeignKey
ALTER TABLE "PeladaMembership" ADD CONSTRAINT "PeladaMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaMembership" ADD CONSTRAINT "PeladaMembership_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaInvite" ADD CONSTRAINT "PeladaInvite_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaInvite" ADD CONSTRAINT "PeladaInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyFeeConfig" ADD CONSTRAINT "MonthlyFeeConfig_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayment" ADD CONSTRAINT "MonthlyPayment_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
