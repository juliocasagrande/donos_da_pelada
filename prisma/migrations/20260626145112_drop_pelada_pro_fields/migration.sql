-- DropIndex
DROP INDEX "Pelada_mpSubscriptionId_key";

-- AlterTable
ALTER TABLE "Pelada" DROP COLUMN "mpAuthorizedAmount",
DROP COLUMN "mpPaymentError",
DROP COLUMN "mpPaymentId",
DROP COLUMN "mpPaymentPreferenceId",
DROP COLUMN "mpPaymentStatus",
DROP COLUMN "mpPaymentStatusDetail",
DROP COLUMN "mpSubscriptionId",
DROP COLUMN "mpSubscriptionInterval",
DROP COLUMN "plan",
DROP COLUMN "proCancelRollbackUntil",
DROP COLUMN "proCancelUntil",
DROP COLUMN "proCaptureAt",
DROP COLUMN "proRenewsAt",
DROP COLUMN "subscriptionCancelledAt";

