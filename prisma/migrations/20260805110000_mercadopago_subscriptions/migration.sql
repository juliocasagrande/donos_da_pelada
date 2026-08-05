ALTER TABLE "User"
ADD COLUMN "mpSubscriptionId" TEXT,
ADD COLUMN "mpSubscriptionStatus" TEXT;

CREATE TABLE "MercadoPagoSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT,
    "activeKey" TEXT,
    "requestKey" TEXT NOT NULL,
    "payerEmail" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "nextPaymentAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "previousProRenewsAt" TIMESTAMP(3),
    "lastPaymentId" TEXT,
    "lastPaymentStatus" TEXT,
    "lastPaymentStatusDetail" TEXT,
    "lastPaymentAt" TIMESTAMP(3),
    "error" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MercadoPagoSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MercadoPagoInvoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" TEXT NOT NULL,
    "statusDetail" TEXT,
    "amount" DOUBLE PRECISION,
    "debitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MercadoPagoInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_mpSubscriptionId_key" ON "User"("mpSubscriptionId");
CREATE UNIQUE INDEX "MercadoPagoSubscription_externalId_key" ON "MercadoPagoSubscription"("externalId");
CREATE UNIQUE INDEX "MercadoPagoSubscription_activeKey_key" ON "MercadoPagoSubscription"("activeKey");
CREATE UNIQUE INDEX "MercadoPagoSubscription_requestKey_key" ON "MercadoPagoSubscription"("requestKey");
CREATE INDEX "MercadoPagoSubscription_userId_createdAt_idx" ON "MercadoPagoSubscription"("userId", "createdAt");
CREATE INDEX "MercadoPagoSubscription_status_nextPaymentAt_idx" ON "MercadoPagoSubscription"("status", "nextPaymentAt");
CREATE UNIQUE INDEX "MercadoPagoInvoice_externalId_key" ON "MercadoPagoInvoice"("externalId");
CREATE UNIQUE INDEX "MercadoPagoInvoice_paymentId_key" ON "MercadoPagoInvoice"("paymentId");
CREATE INDEX "MercadoPagoInvoice_subscriptionId_debitDate_idx" ON "MercadoPagoInvoice"("subscriptionId", "debitDate");
CREATE INDEX "MercadoPagoInvoice_status_updatedAt_idx" ON "MercadoPagoInvoice"("status", "updatedAt");

ALTER TABLE "MercadoPagoSubscription" ADD CONSTRAINT "MercadoPagoSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MercadoPagoInvoice" ADD CONSTRAINT "MercadoPagoInvoice_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "MercadoPagoSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
