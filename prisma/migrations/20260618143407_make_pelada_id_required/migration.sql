-- DropIndex
DROP INDEX "MonthlyFeeConfig_peladaId_idx";

-- DropIndex
DROP INDEX "MonthlyFeeConfig_year_month_key";

-- DropIndex
DROP INDEX "MonthlyPayment_peladaId_idx";

-- DropIndex
DROP INDEX "MonthlyPayment_playerId_year_month_key";

-- DropIndex
DROP INDEX "Player_userId_key";

-- DropIndex
DROP INDEX "Transaction_date_idx";

-- DropIndex
DROP INDEX "Transaction_peladaId_idx";

-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "peladaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MonthlyFeeConfig" ALTER COLUMN "peladaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MonthlyPayment" ALTER COLUMN "peladaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "peladaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "peladaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFeeConfig_peladaId_year_month_key" ON "MonthlyFeeConfig"("peladaId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPayment_peladaId_playerId_year_month_key" ON "MonthlyPayment"("peladaId", "playerId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_peladaId_key" ON "Player"("userId", "peladaId");

-- CreateIndex
CREATE INDEX "Transaction_peladaId_date_idx" ON "Transaction"("peladaId", "date");

