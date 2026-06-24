import { capturePayment, getPayment, type MpPayment } from "@/lib/mercadopago";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

const FREE_CANCEL_DAYS = 5;
const TERMINAL_FAILURE_STATUSES = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

function isPlanInterval(value: unknown): value is PlanInterval {
  return value === "mensal" || value === "trimestral" || value === "anual";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isExpectedAmount(payment: MpPayment, interval: PlanInterval) {
  const amount = payment.transaction_amount;
  return payment.currency_id === "BRL" && typeof amount === "number" && Math.abs(amount - PLAN_PRICES[interval].amount) < 0.001;
}

function paymentFailureMessage(payment: MpPayment) {
  return payment.status_detail || "O Mercado Pago nao confirmou a captura do pagamento.";
}

async function revokePendingPayment(pelada: {
  id: string;
  proCancelRollbackUntil: Date | null;
}, payment: MpPayment) {
  const now = new Date();
  const rollbackStillPro = Boolean(pelada.proCancelRollbackUntil && pelada.proCancelRollbackUntil > now);

  return prisma.pelada.update({
    where: { id: pelada.id },
    data: {
      plan: rollbackStillPro ? "PRO" : "FREE",
      proRenewsAt: rollbackStillPro ? pelada.proCancelRollbackUntil : null,
      proCancelUntil: null,
      proCancelRollbackUntil: null,
      proCaptureAt: null,
      mpPaymentStatus: payment.status,
      mpPaymentStatusDetail: payment.status_detail || null,
      mpPaymentError: paymentFailureMessage(payment)
    }
  });
}

export async function activatePeladaFromPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  return syncPeladaFromPayment(payment);
}

/**
 * Applies a Mercado Pago payment only when it belongs to the pelada that
 * initiated it. New payment IDs are accepted exclusively by the authenticated
 * authorization endpoint; webhooks can only advance an already recorded ID.
 */
export async function syncPeladaFromPayment(payment: MpPayment, options: { allowNewPayment?: boolean } = {}) {
  const peladaId = payment.metadata?.pelada_id || payment.external_reference;
  const interval = payment.metadata?.plan_interval;
  const paymentId = String(payment.id);

  if (!peladaId || !isPlanInterval(interval) || !isExpectedAmount(payment, interval)) return null;
  if (payment.external_reference && payment.external_reference !== peladaId) return null;

  const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
  if (!pelada) return null;

  const isKnownPayment = pelada.mpPaymentId === paymentId;
  if (!isKnownPayment && !options.allowNewPayment) return null;
  // Do not replace an active authorization with a different payment.
  if (!isKnownPayment && pelada.plan === "PRO_IN_PROGRESS") return null;

  const commonData = {
    mpPaymentId: paymentId,
    mpPaymentStatus: payment.status,
    mpPaymentStatusDetail: payment.status_detail || null,
    mpPaymentError: null,
    mpAuthorizedAmount: payment.transaction_amount,
    mpSubscriptionInterval: interval
  };

  if (payment.status === "authorized") {
    // A duplicated webhook must not extend the cancellation/capture windows.
    if (isKnownPayment) {
      return prisma.pelada.update({ where: { id: pelada.id }, data: commonData });
    }

    const now = new Date();
    const currentEnd = pelada.proRenewsAt && pelada.proRenewsAt > now ? pelada.proRenewsAt : now;
    return prisma.pelada.update({
      where: { id: pelada.id },
      data: {
        ...commonData,
        plan: "PRO_IN_PROGRESS",
        proCancelUntil: addDays(now, FREE_CANCEL_DAYS),
        proCancelRollbackUntil: currentEnd > now ? currentEnd : null,
        proCaptureAt: addDays(now, FREE_CANCEL_DAYS),
        proRenewsAt: addMonths(currentEnd, PLAN_PRICES[interval].frequency),
        subscriptionCancelledAt: null,
        trialEndsAt: null
      }
    });
  }

  if (payment.status === "approved") {
    // Only the scheduled capture may turn a pending authorization into Pro.
    if (!isKnownPayment || pelada.plan !== "PRO_IN_PROGRESS") return null;
    return prisma.pelada.update({
      where: { id: pelada.id },
      data: {
        ...commonData,
        plan: "PRO",
        proCancelUntil: null,
        proCancelRollbackUntil: null,
        proCaptureAt: null,
        subscriptionCancelledAt: null,
        trialEndsAt: null
      }
    });
  }

  if (isKnownPayment && pelada.plan === "PRO_IN_PROGRESS" && TERMINAL_FAILURE_STATUSES.has(payment.status)) {
    return revokePendingPayment(pelada, payment);
  }

  if (!isKnownPayment) return null;
  return prisma.pelada.update({
    where: { id: pelada.id },
    data: {
      mpPaymentStatus: payment.status,
      mpPaymentStatusDetail: payment.status_detail || null,
      mpPaymentError: TERMINAL_FAILURE_STATUSES.has(payment.status) ? paymentFailureMessage(payment) : null
    }
  });
}

export async function syncPeladaPaymentByPeladaId(peladaId: string, paymentId?: string | null) {
  if (!paymentId) return prisma.pelada.findUnique({ where: { id: peladaId } });
  return activatePeladaFromPayment(paymentId);
}

export async function captureDueProPayments(now = new Date()) {
  const duePeladas = await prisma.pelada.findMany({
    where: {
      plan: "PRO_IN_PROGRESS",
      proCaptureAt: { lte: now },
      mpPaymentId: { not: null }
    }
  });

  const results = [];
  for (const pelada of duePeladas) {
    try {
      const payment = await capturePayment(pelada.mpPaymentId!);
      results.push(await syncPeladaFromPayment(payment));
    } catch (error) {
      // A timeout can mean that MP captured the card. Reconcile first and only
      // remove access when MP reports a terminal failure.
      const message = error instanceof Error ? error.message : "Falha ao efetivar pagamento.";
      try {
        const payment = await getPayment(pelada.mpPaymentId!);
        const synced = await syncPeladaFromPayment(payment);
        if (payment.status === "authorized" || payment.status === "in_process" || payment.status === "pending") {
          results.push(await prisma.pelada.update({
            where: { id: pelada.id },
            data: { mpPaymentError: message, mpPaymentStatus: payment.status, mpPaymentStatusDetail: payment.status_detail || message }
          }));
        } else {
          results.push(synced);
        }
      } catch {
        results.push(await prisma.pelada.update({
          where: { id: pelada.id },
          data: { mpPaymentError: message, mpPaymentStatusDetail: message }
        }));
      }
    }
  }

  return results;
}