import {
  cancelSubscription,
  findAuthorizedPaymentsBySubscriptionId,
  findSubscriptionByReference,
  getAuthorizedPayment,
  getSubscription,
  type MpAuthorizedPayment,
  type MpSubscription
} from "@/lib/mercadopago";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import type { MercadoPagoSubscription } from "@prisma/client";

export const SUBSCRIPTION_TRIAL_DAYS = 4;
const TERMINAL_PAYMENT_STATUSES = new Set(["cancelled", "canceled", "refunded", "charged_back"]);
const REVOKED_PAYMENT_STATUSES = new Set(["refunded", "charged_back"]);

function isPlanInterval(value: unknown): value is PlanInterval {
  return value === "mensal" || value === "trimestral" || value === "anual";
}

function asDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function matchesLocalContract(remote: MpSubscription, local: { id: string; interval: string; amount: number }) {
  if (!isPlanInterval(local.interval)) return false;
  const recurring = remote.auto_recurring;
  const amount = Number(recurring?.transaction_amount);
  return String(remote.external_reference || "") === local.id &&
    recurring?.frequency === PLAN_PRICES[local.interval].frequency &&
    recurring?.frequency_type === "months" &&
    recurring?.currency_id === "BRL" &&
    Number.isFinite(amount) && Math.abs(amount - local.amount) < 0.001;
}

export async function syncSubscriptionById(subscriptionId: string) {
  return syncSubscriptionFromMercadoPago(await getSubscription(subscriptionId));
}

export async function syncSubscriptionFromMercadoPago(remote: MpSubscription) {
  const externalReference = String(remote.external_reference || "");
  const local = await prisma.mercadoPagoSubscription.findFirst({
    where: { OR: [{ externalId: remote.id }, { id: externalReference }] },
    include: { user: { select: { mpSubscriptionId: true } } }
  });
  if (!local || !matchesLocalContract(remote, local)) return null;
  if (local.externalId && local.externalId !== remote.id) return null;

  const nextPaymentAt = asDate(remote.next_payment_date);
  const statusData = {
    externalId: remote.id,
    status: remote.status,
    nextPaymentAt,
    error: null
  };

  // A delayed webhook from a previous subscription may update its audit row,
  // but it cannot overwrite the user's newer active subscription.
  if (!local.activeKey && local.user.mpSubscriptionId && local.user.mpSubscriptionId !== remote.id) {
    return prisma.mercadoPagoSubscription.update({ where: { id: local.id }, data: statusData });
  }

  if (remote.status === "cancelled" || local.cancelledAt) {
    const now = new Date();
    const paidUntil = local.lastPaymentStatus === "approved" ? local.nextPaymentAt : local.previousProRenewsAt;
    const keepPro = Boolean(paidUntil && paidUntil > now);
    return prisma.$transaction([
      prisma.mercadoPagoSubscription.update({
        where: { id: local.id },
        data: { ...statusData, status: "cancelled", activeKey: null, cancelledAt: local.cancelledAt || now }
      }),
      prisma.user.update({
        where: { id: local.userId },
        data: {
          plan: keepPro ? "PRO" : "FREE",
          proRenewsAt: keepPro ? paidUntil : null,
          proCancelUntil: null,
          proCaptureAt: null,
          subscriptionCancelledAt: local.cancelledAt || now,
          mpSubscriptionId: remote.id,
          mpSubscriptionStatus: "cancelled"
        }
      })
    ]);
  }

  if (remote.status === "authorized") {
    const paid = local.lastPaymentStatus === "approved";
    return prisma.$transaction([
      prisma.mercadoPagoSubscription.update({ where: { id: local.id }, data: { ...statusData, activeKey: local.userId } }),
      prisma.user.update({
        where: { id: local.userId },
        data: {
          plan: paid ? "PRO" : "PRO_IN_PROGRESS",
          proRenewsAt: nextPaymentAt || local.trialEndsAt,
          proCancelUntil: paid ? null : local.trialEndsAt,
          proCaptureAt: null,
          subscriptionCancelledAt: null,
          mpSubscriptionId: remote.id,
          mpSubscriptionStatus: remote.status,
          mpSubscriptionInterval: local.interval,
          mpAuthorizedAmount: local.amount,
          mpPaymentError: null
        }
      })
    ]);
  }

  return prisma.mercadoPagoSubscription.update({ where: { id: local.id }, data: statusData });
}

export async function syncAuthorizedPaymentById(invoiceId: string) {
  return syncAuthorizedPaymentFromMercadoPago(await getAuthorizedPayment(invoiceId));
}

export async function syncAuthorizedPaymentFromMercadoPago(invoice: MpAuthorizedPayment) {
  const local = await prisma.mercadoPagoSubscription.findUnique({ where: { externalId: invoice.preapproval_id } });
  if (!local || !isPlanInterval(local.interval)) return null;
  if (invoice.external_reference && String(invoice.external_reference) !== local.id) return null;
  const amount = invoice.transaction_amount === undefined ? null : Number(invoice.transaction_amount);
  if (amount !== null && (!Number.isFinite(amount) || Math.abs(amount - local.amount) >= 0.001)) return null;
  if (invoice.currency_id && invoice.currency_id !== "BRL") return null;

  const paymentId = invoice.payment?.id === undefined ? null : String(invoice.payment.id);
  const paymentStatus = invoice.payment?.status || invoice.status || "unknown";
  const debitDate = asDate(invoice.debit_date);
  const isNewest = !local.lastPaymentAt || !debitDate || debitDate >= local.lastPaymentAt;

  await prisma.mercadoPagoInvoice.upsert({
    where: { externalId: String(invoice.id) },
    create: {
      subscriptionId: local.id,
      externalId: String(invoice.id),
      paymentId,
      status: paymentStatus,
      statusDetail: invoice.payment?.status_detail || null,
      amount,
      debitDate
    },
    update: {
      paymentId,
      status: paymentStatus,
      statusDetail: invoice.payment?.status_detail || null,
      amount,
      debitDate
    }
  });

  if (isNewest) {
    await prisma.mercadoPagoSubscription.update({
      where: { id: local.id },
      data: {
        lastPaymentId: paymentId,
        lastPaymentStatus: paymentStatus,
        lastPaymentStatusDetail: invoice.payment?.status_detail || null,
        lastPaymentAt: debitDate || new Date(),
        error: paymentStatus === "approved" ? null : invoice.payment?.status_detail || paymentStatus
      }
    });
  }

  // Historical or late events are recorded for audit, but must not replace a
  // newer entitlement or reactivate a subscription cancelled by the user.
  if (!isNewest || local.cancelledAt) return invoice;

  if (paymentStatus === "approved") {
    const remote = await getSubscription(local.externalId!);
    const synced = await syncSubscriptionFromMercadoPago(remote);
    const renewsAt = asDate(remote.next_payment_date) || addMonths(debitDate || new Date(), PLAN_PRICES[local.interval].frequency);
    await prisma.user.update({
      where: { id: local.userId },
      data: {
        plan: "PRO",
        proRenewsAt: renewsAt,
        proCancelUntil: null,
        mpPaymentId: paymentId,
        mpPaymentStatus: paymentStatus,
        mpPaymentStatusDetail: invoice.payment?.status_detail || null,
        mpPaymentError: null
      }
    });
    return synced;
  }

  return applyFailedInvoice(local, paymentStatus, invoice.payment?.status_detail, paymentId);
}

async function applyFailedInvoice(
  local: MercadoPagoSubscription,
  paymentStatus: string,
  statusDetail?: string,
  paymentId?: string | null
) {
  const message = statusDetail || paymentStatus;
  if (REVOKED_PAYMENT_STATUSES.has(paymentStatus)) {
    try {
      if (local.externalId) await cancelSubscription(local.externalId);
    } catch (error) {
      console.error("Falha ao cancelar assinatura apos estorno:", error);
    }
    const now = new Date();
    return prisma.$transaction([
      prisma.mercadoPagoSubscription.update({
        where: { id: local.id },
        data: { status: "cancelled", activeKey: null, cancelledAt: now, error: message }
      }),
      prisma.user.update({
        where: { id: local.userId },
        data: {
          plan: "FREE",
          proRenewsAt: null,
          proCancelUntil: null,
          subscriptionCancelledAt: now,
          mpSubscriptionStatus: "cancelled",
          mpPaymentId: paymentId,
          mpPaymentStatus: paymentStatus,
          mpPaymentStatusDetail: statusDetail || null,
          mpPaymentError: message
        }
      })
    ]);
  }

  const user = await prisma.user.findUnique({ where: { id: local.userId }, select: { proRenewsAt: true } });
  const expired = !user?.proRenewsAt || user.proRenewsAt <= new Date();
  return prisma.user.update({
    where: { id: local.userId },
    data: {
      plan: expired && (paymentStatus === "rejected" || TERMINAL_PAYMENT_STATUSES.has(paymentStatus)) ? "FREE" : undefined,
      proRenewsAt: expired ? null : undefined,
      mpPaymentId: paymentId,
      mpPaymentStatus: paymentStatus,
      mpPaymentStatusDetail: statusDetail || null,
      mpPaymentError: message
    }
  });
}

export async function reconcileActiveSubscriptions() {
  const active = await prisma.mercadoPagoSubscription.findMany({
    where: { activeKey: { not: null } },
    select: { id: true, externalId: true, payerEmail: true, createdAt: true }
  });
  const results = [];
  for (const item of active) {
    try {
      let subscriptionId = item.externalId;
      if (!subscriptionId) {
        const recovered = await findSubscriptionByReference(item.payerEmail, item.id);
        if (!recovered) {
          const stale = Date.now() - item.createdAt.getTime() > 15 * 60 * 1000;
          if (stale) {
            await prisma.mercadoPagoSubscription.update({
              where: { id: item.id },
              data: { status: "failed", activeKey: null, error: "Assinatura nao encontrada no Mercado Pago." }
            });
          }
          results.push({ subscriptionId: item.id, ok: !stale });
          continue;
        }
        await syncSubscriptionFromMercadoPago(recovered);
        subscriptionId = recovered.id;
      }
      const remote = await getSubscription(subscriptionId);
      await syncSubscriptionFromMercadoPago(remote);
      const invoices = await findAuthorizedPaymentsBySubscriptionId(subscriptionId);
      invoices.sort((a, b) => String(a.debit_date || "").localeCompare(String(b.debit_date || "")));
      for (const invoice of invoices) await syncAuthorizedPaymentFromMercadoPago(invoice);
      results.push({ subscriptionId, ok: true });
    } catch (error) {
      console.error("Falha ao conciliar assinatura Mercado Pago:", error);
      results.push({ subscriptionId: item.externalId, ok: false });
    }
  }
  return results;
}
