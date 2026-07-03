import { capturePayment, getPayment, type MpPayment } from "@/lib/mercadopago";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

const FREE_CANCEL_DAYS = 4;
const TERMINAL_FAILURE_STATUSES = new Set(["rejected", "cancelled", "canceled", "refunded", "charged_back"]);

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

async function revokePendingPayment(user: {
  id: string;
  proCancelRollbackUntil: Date | null;
}, payment: MpPayment) {
  const now = new Date();
  const rollbackStillPro = Boolean(user.proCancelRollbackUntil && user.proCancelRollbackUntil > now);

  return prisma.user.update({
    where: { id: user.id },
    data: {
      plan: rollbackStillPro ? "PRO" : "FREE",
      proRenewsAt: rollbackStillPro ? user.proCancelRollbackUntil : null,
      proCancelUntil: null,
      proCancelRollbackUntil: null,
      proCaptureAt: null,
      mpPaymentStatus: payment.status,
      mpPaymentStatusDetail: payment.status_detail || null,
      mpPaymentError: paymentFailureMessage(payment)
    }
  });
}

export async function activateUserFromPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  return syncUserFromPayment(payment);
}

/**
 * Applies a Mercado Pago payment only when it belongs to the user that
 * initiated it. New payment IDs are accepted exclusively by the authenticated
 * authorization endpoint; webhooks can only advance an already recorded ID.
 */
export async function syncUserFromPayment(payment: MpPayment, options: { allowNewPayment?: boolean } = {}) {
  const userId = payment.metadata?.user_id || payment.external_reference;
  const interval = payment.metadata?.plan_interval;
  const paymentId = String(payment.id);

  if (!userId || !isPlanInterval(interval) || !isExpectedAmount(payment, interval)) return null;
  if (payment.external_reference && payment.external_reference !== userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const isKnownPayment = user.mpPaymentId === paymentId;
  if (!isKnownPayment && !options.allowNewPayment) return null;
  // Do not replace an active authorization with a different payment.
  if (!isKnownPayment && user.plan === "PRO_IN_PROGRESS") return null;

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
      return prisma.user.update({ where: { id: user.id }, data: commonData });
    }

    const now = new Date();
    const currentEnd = user.proRenewsAt && user.proRenewsAt > now ? user.proRenewsAt : now;
    return prisma.user.update({
      where: { id: user.id },
      data: {
        ...commonData,
        plan: "PRO_IN_PROGRESS",
        proCancelUntil: addDays(now, FREE_CANCEL_DAYS),
        proCancelRollbackUntil: currentEnd > now ? currentEnd : null,
        proCaptureAt: addDays(now, FREE_CANCEL_DAYS),
        proRenewsAt: addMonths(currentEnd, PLAN_PRICES[interval].frequency),
        subscriptionCancelledAt: null
      }
    });
  }

  if (payment.status === "approved") {
    // Only the scheduled capture may turn a pending authorization into Pro.
    if (!isKnownPayment || user.plan !== "PRO_IN_PROGRESS") return null;
    return prisma.user.update({
      where: { id: user.id },
      data: {
        ...commonData,
        plan: "PRO",
        proCancelUntil: null,
        proCancelRollbackUntil: null,
        proCaptureAt: null,
        subscriptionCancelledAt: null
      }
    });
  }

  if (isKnownPayment && user.plan === "PRO_IN_PROGRESS" && TERMINAL_FAILURE_STATUSES.has(payment.status)) {
    return revokePendingPayment(user, payment);
  }

  if (!isKnownPayment) return null;
  return prisma.user.update({
    where: { id: user.id },
    data: {
      mpPaymentStatus: payment.status,
      mpPaymentStatusDetail: payment.status_detail || null,
      mpPaymentError: TERMINAL_FAILURE_STATUSES.has(payment.status) ? paymentFailureMessage(payment) : null
    }
  });
}

export async function syncUserPaymentByUserId(userId: string, paymentId?: string | null) {
  if (!paymentId) return prisma.user.findUnique({ where: { id: userId } });
  return activateUserFromPayment(paymentId);
}

export async function captureDueProPayments(now = new Date()) {
  const dueUsers = await prisma.user.findMany({
    where: {
      plan: "PRO_IN_PROGRESS",
      proCaptureAt: { lte: now },
      mpPaymentId: { not: null }
    }
  });

  const results = [];
  for (const user of dueUsers) {
    try {
      const payment = await capturePayment(user.mpPaymentId!);
      results.push(await syncUserFromPayment(payment));
    } catch (error) {
      // A timeout can mean that MP captured the card. Reconcile first and only
      // remove access when MP reports a terminal failure.
      const message = error instanceof Error ? error.message : "Falha ao efetivar pagamento.";
      try {
        const payment = await getPayment(user.mpPaymentId!);
        const synced = await syncUserFromPayment(payment);
        if (payment.status === "authorized" || payment.status === "in_process" || payment.status === "pending") {
          results.push(await prisma.user.update({
            where: { id: user.id },
            data: { mpPaymentError: message, mpPaymentStatus: payment.status, mpPaymentStatusDetail: payment.status_detail || message }
          }));
        } else {
          results.push(synced);
        }
      } catch {
        results.push(await prisma.user.update({
          where: { id: user.id },
          data: { mpPaymentError: message, mpPaymentStatusDetail: message }
        }));
      }
    }
  }

  return results;
}
