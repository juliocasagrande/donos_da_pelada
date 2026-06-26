-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mpAuthorizedAmount" DOUBLE PRECISION,
ADD COLUMN     "mpPaymentError" TEXT,
ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "mpPaymentStatus" TEXT,
ADD COLUMN     "mpPaymentStatusDetail" TEXT,
ADD COLUMN     "mpSubscriptionInterval" TEXT,
ADD COLUMN     "plan" "PeladaPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "proCancelRollbackUntil" TIMESTAMP(3),
ADD COLUMN     "proCancelUntil" TIMESTAMP(3),
ADD COLUMN     "proCaptureAt" TIMESTAMP(3),
ADD COLUMN     "proRenewsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionCancelledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Pelada_createdByUserId_idx" ON "Pelada"("createdByUserId");
