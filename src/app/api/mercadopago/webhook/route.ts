import { NextResponse } from "next/server";
import { findAuthorizedPaymentByPaymentId } from "@/lib/mercadopago";
import { activateUserFromPayment } from "@/lib/mercadopagoSync";
import { syncAuthorizedPaymentById, syncAuthorizedPaymentFromMercadoPago, syncSubscriptionById } from "@/lib/mercadopagoSubscriptionSync";
import { isValidMercadoPagoSignature, type MercadoPagoWebhookPayload } from "@/lib/mercadopagoWebhook";

export async function POST(request: Request) {
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error("MERCADOPAGO_WEBHOOK_SECRET nao configurado.");
    return NextResponse.json({ error: "Webhook indisponivel." }, { status: 503 });
  }

  let payload: MercadoPagoWebhookPayload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!isValidMercadoPagoSignature(request, payload, process.env.MERCADOPAGO_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Assinatura invalida." }, { status: 401 });
  }

  const resourceId = payload.data?.id ? String(payload.data.id) : "";
  if (!resourceId) return NextResponse.json({ ok: true });

  try {
    if (payload.type === "subscription_preapproval") {
      await syncSubscriptionById(resourceId);
    } else if (payload.type === "subscription_authorized_payment") {
      await syncAuthorizedPaymentById(resourceId);
    } else if (payload.type === "payment" || payload.action?.startsWith("payment.")) {
      const invoice = await findAuthorizedPaymentByPaymentId(resourceId);
      if (invoice) await syncAuthorizedPaymentFromMercadoPago(invoice);
      else await activateUserFromPayment(resourceId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar webhook do Mercado Pago:", error);
    return NextResponse.json({ error: "Falha ao processar notificacao." }, { status: 500 });
  }
}
