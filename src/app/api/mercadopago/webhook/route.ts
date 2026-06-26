import crypto from "crypto";
import { NextResponse } from "next/server";
import { activateUserFromPayment } from "@/lib/mercadopagoSync";

type WebhookPayload = { type?: string; action?: string; data?: { id?: string | number } };

function isValidSignature(request: Request, payload: WebhookPayload) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    })
  );
  const timestamp = parts.ts;
  const receivedHash = parts.v1;
  if (!timestamp || !receivedHash) return false;

  const timestampNumber = Number(timestamp);
  const timestampMs = timestamp.length > 10 ? timestampNumber : timestampNumber * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;

  const dataId = new URL(request.url).searchParams.get("data.id") || String(payload.data?.id || "");
  if (!dataId) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error("MERCADOPAGO_WEBHOOK_SECRET nao configurado.");
    return NextResponse.json({ error: "Webhook indisponivel." }, { status: 503 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!isValidSignature(request, payload)) {
    return NextResponse.json({ error: "Assinatura invalida." }, { status: 401 });
  }

  const paymentId = payload.data?.id ? String(payload.data.id) : "";
  const isPaymentEvent = payload.type === "payment" || payload.action?.startsWith("payment.");
  if (!isPaymentEvent || !paymentId) return NextResponse.json({ ok: true });

  try {
    // The canonical payment is fetched from Mercado Pago; webhook fields are
    // used only to identify the event.
    await activateUserFromPayment(paymentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar webhook do Mercado Pago:", error);
    return NextResponse.json({ error: "Falha ao processar notificacao." }, { status: 500 });
  }
}