import crypto from "crypto";
import { NextResponse } from "next/server";
import { activatePeladaFromPayment } from "@/lib/mercadopagoSync";

function isValidSignature(request: Request, body: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );
  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const dataId = new URL(request.url).searchParams.get("data.id") || "";
  const manifest = `id:${dataId};request-id:${requestId || ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  void body;
  return expected === hash;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidSignature(request, rawBody)) {
    return NextResponse.json({ error: "Assinatura invalida." }, { status: 401 });
  }

  let payload: { type?: string; action?: string; data?: { id?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const paymentId = payload.data?.id;
  const isPaymentEvent = payload.type === "payment" || payload.action?.startsWith("payment.");
  if (!isPaymentEvent || !paymentId) return NextResponse.json({ ok: true });

  try {
    await activatePeladaFromPayment(paymentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar webhook do Mercado Pago:", error);
    return NextResponse.json({ error: "Falha ao processar notificacao." }, { status: 500 });
  }
}
