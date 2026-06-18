import { capturePayment, getPayment, type MpPayment } from "@/lib/mercadopago";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

const FREE_CANCEL_DAYS = 7;

function normalizeInterval(interval?: string | null): PlanInterval {
  return interval === "mensal" || interval === "trimestral" || interval === "anual" ? interval : "mensal";
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

export async function activatePeladaFromPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  return syncPeladaFromPayment(payment);
}

export async function syncPeladaFromPayment(payment: MpPayment) {
  const peladaId = payment.metadata?.pelada_id || payment.external_reference;
  if (!peladaId) return null;

  const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
  if (!pelada) return null;

  const interval = normalizeInterval(payment.metadata?.plan_interval || pelada.mpSubscriptionInterval);
  const now = new Date();
  const currentEnd = pelada.proRenewsAt && pelada.proRenewsAt > now ? pelada.proRenewsAt : now;
  const proRenewsAt = addMonths(currentEnd, PLAN_PRICES[interval].frequency);
  const commonData = {
    mpPaymentId: String(payment.id),
    mpPaymentStatus: payment.status,
    mpPaymentStatusDetail: payment.status_detail || null,
    mpPaymentError: null,
    mpAuthorizedAmount: payment.transaction_amount || PLAN_PRICES[interval].amount,
    mpSubscriptionInterval: interval
  };

  if (payment.status === "authorized") {
    return prisma.pelada.update({
      where: { id: pelada.id },
      data: {
        ...commonData,
        plan: "PRO_IN_PROGRESS",
        proCancelUntil: addDays(now, FREE_CANCEL_DAYS),
        proCancelRollbackUntil: currentEnd > now ? currentEnd : null,
        proCaptureAt: addDays(now, FREE_CANCEL_DAYS),
        proRenewsAt,
        subscriptionCancelledAt: null,
        trialEndsAt: null
      }
    });
  }

  if (payment.status === "approved") {
    const renewal = pelada.proRenewsAt && pelada.proRenewsAt > now ? pelada.proRenewsAt : proRenewsAt;
    return prisma.pelada.update({
      where: { id: pelada.id },
      data: {
        ...commonData,
        plan: "PRO",
        proCancelUntil: null,
        proCancelRollbackUntil: null,
        proCaptureAt: null,
        proRenewsAt: renewal,
        subscriptionCancelledAt: null,
        trialEndsAt: null
      }
    });
  }

  return prisma.pelada.update({
    where: { id: pelada.id },
    data: {
      mpPaymentId: String(payment.id),
      mpPaymentStatus: payment.status,
      mpPaymentStatusDetail: payment.status_detail || null,
      mpPaymentError: payment.status === "rejected" ? payment.status_detail || "Pagamento rejeitado." : null
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
      const message = error instanceof Error ? error.message : "Falha ao efetivar pagamento.";
      const rollbackStillPro = Boolean(pelada.proCancelRollbackUntil && pelada.proCancelRollbackUntil > now);
      results.push(
        await prisma.pelada.update({
          where: { id: pelada.id },
          data: {
            plan: rollbackStillPro ? "PRO" : "FREE",
            proRenewsAt: rollbackStillPro ? pelada.proCancelRollbackUntil : null,
            proCancelUntil: null,
            proCancelRollbackUntil: null,
            proCaptureAt: null,
            mpPaymentError: message,
            mpPaymentStatus: "capture_failed",
            mpPaymentStatusDetail: message
          }
        })
      );
    }
  }

  return results;
}
