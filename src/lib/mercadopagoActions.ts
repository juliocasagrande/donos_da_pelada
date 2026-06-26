"use server";

import { redirect } from "next/navigation";
import { cancelAuthorizedPayment } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function cancelProPeriod() {
  const currentUser = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
  if (!user) redirect("/dashboard");

  const now = new Date();
  const inFreeCancellationPeriod = Boolean(user.proCancelUntil && user.proCancelUntil.getTime() > now.getTime());

  if (inFreeCancellationPeriod) {
    if (user.plan === "PRO_IN_PROGRESS" && user.mpPaymentId) {
      try {
        await cancelAuthorizedPayment(user.mpPaymentId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel cancelar a autorizacao.";
        await prisma.user.update({
          where: { id: user.id },
          data: { mpPaymentError: message, mpPaymentStatusDetail: message }
        });
        redirect("/pagamento?cancelado=erro");
      }
    }

    const rollbackStillPro = Boolean(user.proCancelRollbackUntil && user.proCancelRollbackUntil.getTime() > now.getTime());
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: rollbackStillPro ? "PRO" : "FREE",
        proCancelUntil: null,
        proCancelRollbackUntil: null,
        proCaptureAt: null,
        proRenewsAt: rollbackStillPro ? user.proCancelRollbackUntil : null,
        subscriptionCancelledAt: now,
        mpPaymentStatus: user.plan === "PRO_IN_PROGRESS" ? "cancelled" : user.mpPaymentStatus,
        mpPaymentStatusDetail: user.plan === "PRO_IN_PROGRESS" ? "cancelado_no_periodo_gratuito" : user.mpPaymentStatusDetail
      }
    });
    redirect("/pagamento?cancelado=gratis");
  }

  redirect("/pagamento?cancelado=fora-do-periodo");
}
