-- Store monetary values with exact decimal arithmetic.
ALTER TABLE "User"
  ALTER COLUMN "mpAuthorizedAmount" TYPE DECIMAL(10,2)
  USING ROUND("mpAuthorizedAmount"::numeric, 2);

ALTER TABLE "MercadoPagoSubscription"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2)
  USING ROUND("amount"::numeric, 2);

ALTER TABLE "MercadoPagoInvoice"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2)
  USING ROUND("amount"::numeric, 2);

ALTER TABLE "MonthlyFeeConfig"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2)
  USING ROUND("amount"::numeric, 2);

ALTER TABLE "MonthlyPayment"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2)
  USING ROUND("amount"::numeric, 2);

ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2)
  USING ROUND("amount"::numeric, 2);

ALTER TABLE "Match"
  ALTER COLUMN "guestLineFeeAmount" TYPE DECIMAL(10,2)
  USING ROUND("guestLineFeeAmount"::numeric, 2),
  ALTER COLUMN "guestGoalkeeperFeeAmount" TYPE DECIMAL(10,2)
  USING ROUND("guestGoalkeeperFeeAmount"::numeric, 2);

-- These screens filter by user first; the existing unique indexes begin with
-- matchId/peladaId and cannot efficiently serve these access patterns.
CREATE INDEX "PeladaJoinRequest_userId_status_idx"
  ON "PeladaJoinRequest"("userId", "status");

CREATE INDEX "MatchGuestRequest_userId_status_idx"
  ON "MatchGuestRequest"("userId", "status");
