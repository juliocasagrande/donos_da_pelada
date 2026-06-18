import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthorizedPayment, formatMercadoPagoError } from "@/lib/mercadopago";
import { syncPeladaFromPayment } from "@/lib/mercadopagoSync";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { ApiAuthError, requireApiAdmin } from "@/lib/session";

const requestSchema = z.object({
  interval: z.enum(["mensal", "trimestral", "anual"]),
  formData: z.object({
    token: z.string().min(1),
    payment_method_id: z.string().min(1),
    issuer_id: z.string().optional(),
    installments: z.coerce.number().int().min(1).max(5).optional(),
    payer: z
      .object({
        email: z.string().email().optional(),
        identification: z
          .object({
            type: z.string().optional(),
            number: z.string().optional()
          })
          .optional()
      })
      .optional()
  })
});

function failedStatusMessage(status?: string, statusDetail?: string) {
  if (status === "rejected") return statusDetail || "Pagamento recusado pelo Mercado Pago.";
  if (status === "in_process") return "Pagamento em analise. Tente novamente em alguns instantes.";
  if (status === "pending") return "Pagamento pendente. Confirme os dados e tente novamente.";
  return statusDetail || "Nao foi possivel validar os dados de pagamento.";
}

export async function POST(request: Request) {
  try {
    const admin = await requireApiAdmin();
    const payload = requestSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: payload.error.issues[0]?.message || "Dados de pagamento invalidos." }, { status: 400 });
    }

    const pelada = await prisma.pelada.findUnique({ where: { id: admin.peladaId! } });
    if (!pelada) return NextResponse.json({ error: "Pelada nao encontrada." }, { status: 404 });

    const interval = payload.data.interval as PlanInterval;
    const payment = await createAuthorizedPayment({
      peladaId: pelada.id,
      peladaName: pelada.name,
      payerEmail: admin.email || payload.data.formData.payer?.email || "",
      interval,
      formData: payload.data.formData
    });

    await syncPeladaFromPayment(payment);

    if (payment.status !== "authorized") {
      const message = failedStatusMessage(payment.status, payment.status_detail);
      await prisma.pelada.update({
        where: { id: pelada.id },
        data: {
          mpPaymentId: String(payment.id),
          mpPaymentStatus: payment.status,
          mpPaymentStatusDetail: payment.status_detail || null,
          mpPaymentError: message,
          mpAuthorizedAmount: payment.transaction_amount || PLAN_PRICES[interval].amount,
          mpSubscriptionInterval: interval
        }
      });
      return NextResponse.json({ error: message, status: payment.status, statusDetail: payment.status_detail }, { status: 402 });
    }

    return NextResponse.json({
      ok: true,
      status: payment.status,
      statusDetail: payment.status_detail,
      url: `/pagamento?flow=sucesso&plano=${interval}`
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = formatMercadoPagoError(error, error instanceof Error ? error.message : "Falha ao validar pagamento.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
