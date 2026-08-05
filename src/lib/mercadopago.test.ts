import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelAuthorizedPayment, cancelSubscription, createSubscription } from "./mercadopago";
import { isValidMercadoPagoSignature } from "./mercadopagoWebhook";

function response(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("Mercado Pago subscriptions", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST_TOKEN";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  });

  it("creates an annual recurring subscription with a four-day free trial", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: "sub-1", status: "authorized" }));
    vi.stubGlobal("fetch", fetchMock);
    await createSubscription({
      localSubscriptionId: "local-1",
      userName: "Maria",
      payerEmail: "maria@example.com",
      interval: "anual",
      cardTokenId: "card-token",
      backUrl: "https://app.example.com/pagamento"
    });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.mercadopago.com/preapproval");
    expect(init.headers.Authorization).toBe("Bearer TEST_TOKEN");
    expect(body.external_reference).toBe("local-1");
    expect(body.card_token_id).toBe("card-token");
    expect(body.status).toBe("authorized");
    expect(body.auto_recurring).toMatchObject({
      frequency: 12,
      frequency_type: "months",
      transaction_amount: 298.8,
      currency_id: "BRL",
      free_trial: { frequency: 4, frequency_type: "days" }
    });
  });

  it("cancels subscriptions with the official cancelled status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: "sub-1", status: "cancelled" }));
    vi.stubGlobal("fetch", fetchMock);
    await cancelSubscription("sub-1");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({ status: "cancelled" });
  });

  it("also fixes cancellation for legacy authorized payments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 123, status: "cancelled" }));
    vi.stubGlobal("fetch", fetchMock);
    await cancelAuthorizedPayment("123");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({ status: "cancelled" });
  });
});

describe("Mercado Pago webhook signature", () => {
  it("validates the signed query id case-insensitively", () => {
    const secret = "webhook-secret";
    const timestamp = "1704908010";
    const requestId = "request-1";
    const manifest = `id:abc123;request-id:${requestId};ts:${timestamp};`;
    const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    const request = new Request("https://app.example.com/api/webhook?data.id=ABC123", {
      headers: { "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${hash}` }
    });
    expect(isValidMercadoPagoSignature(request, { data: { id: "ABC123" } }, secret)).toBe(true);
  });

  it("rejects malformed and forged signatures", () => {
    const request = new Request("https://app.example.com/api/webhook?data.id=123", {
      headers: { "x-request-id": "request-1", "x-signature": "ts=1,v1=not-a-hash" }
    });
    expect(isValidMercadoPagoSignature(request, { data: { id: 123 } }, "secret")).toBe(false);
  });
});
