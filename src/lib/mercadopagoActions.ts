"use server";

import { redirect } from "next/navigation";
import { cancelAuthorizedPayment } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function cancelProPeriod() {
  const admin = await requireAdmin();
  const pelada = await prisma.pelada.findUnique({ where: { id: admin.peladaId! } });
  if (!pelada) redirect("/dashboard");

  const now = new Date();
  const inFreeCancellationPeriod = Boolean(pelada.proCancelUntil && pelada.proCancelUntil.getTime() > now.getTime());

  if (inFreeCancellationPeriod) {
    if (pelada.plan === "PRO_IN_PROGRESS" && pelada.mpPaymentId) {
      try {
        await cancelAuthorizedPayment(pelada.mpPaymentId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel cancelar a autorizacao.";
        await prisma.pelada.update({
          where: { id: pelada.id },
          data: { mpPaymentError: message, mpPaymentStatusDetail: message }
        });
        redirect("/pagamento?cancelado=erro");
      }
    }

    const rollbackStillPro = Boolean(pelada.proCancelRollbackUntil && pelada.proCancelRollbackUntil.getTime() > now.getTime());
    await prisma.pelada.update({
      where: { id: pelada.id },
      data: {
        plan: rollbackStillPro ? "PRO" : "FREE",
        proCancelUntil: null,
        proCancelRollbackUntil: null,
        proCaptureAt: null,
        proRenewsAt: rollbackStillPro ? pelada.proCancelRollbackUntil : null,
        subscriptionCancelledAt: now,
        mpPaymentStatus: pelada.plan === "PRO_IN_PROGRESS" ? "cancelled" : pelada.mpPaymentStatus,
        mpPaymentStatusDetail: pelada.plan === "PRO_IN_PROGRESS" ? "cancelado_no_periodo_gratuito" : pelada.mpPaymentStatusDetail
      }
    });
    redirect("/pagamento?cancelado=gratis");
  }

  redirect("/pagamento?cancelado=fora-do-periodo");
}
