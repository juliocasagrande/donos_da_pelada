-- AlterEnum
ALTER TYPE "PeladaPlan" ADD VALUE 'PRO_IN_PROGRESS';

-- AlterTable
ALTER TABLE "Pelada" ADD COLUMN "mpPaymentStatus" TEXT;
ALTER TABLE "Pelada" ADD COLUMN "mpPaymentStatusDetail" TEXT;
ALTER TABLE "Pelada" ADD COLUMN "mpPaymentError" TEXT;
ALTER TABLE "Pelada" ADD COLUMN "mpAuthorizedAmount" DOUBLE PRECISION;
ALTER TABLE "Pelada" ADD COLUMN "proCaptureAt" TIMESTAMP(3);
