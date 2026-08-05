import crypto from "crypto";

export type MercadoPagoWebhookPayload = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

export function isValidMercadoPagoSignature(request: Request, payload: MercadoPagoWebhookPayload, secret: string) {
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2);
      return [key, value];
    })
  );
  const timestamp = parts.ts;
  const receivedHash = parts.v1;
  if (!timestamp || !receivedHash || !/^[a-f\d]{64}$/i.test(receivedHash)) return false;
  const dataId = new URL(request.url).searchParams.get("data.id") || String(payload.data?.id || "");
  if (!dataId) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(expectedHash, "hex"));
}
