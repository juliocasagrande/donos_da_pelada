import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";

const MP_API = "https://api.mercadopago.com";
const MP_REQUEST_TIMEOUT_MS = 10_000;

function mercadoPagoFetch(input: string, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(MP_REQUEST_TIMEOUT_MS)
  });
}

function accessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN nao configurado.");
  return token;
}

export type MpPreference = {
  id: string;
  init_point?: string;
};

export type MpPayment = {
  id: number;
  status: "approved" | "pending" | "authorized" | "in_process" | "rejected" | "cancelled" | "canceled" | "refunded" | "charged_back";
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  metadata?: {
    user_id?: string;
    plan_interval?: PlanInterval;
  };
};

export type MpSubscription = {
  id: string;
  status: "pending" | "authorized" | "paused" | "canceled" | "cancelled";
  external_reference?: string | number;
  next_payment_date?: string;
  date_created?: string;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number | string;
    currency_id?: string;
    free_trial?: { frequency?: number; frequency_type?: string };
  };
};

export function isCancelledSubscriptionStatus(status?: string | null) {
  return status === "canceled" || status === "cancelled";
}

export type MpAuthorizedPayment = {
  id: number | string;
  preapproval_id: string;
  external_reference?: string | number;
  transaction_amount?: number | string;
  currency_id?: string;
  debit_date?: string;
  status?: string;
  payment?: { id?: number | string; status?: string; status_detail?: string };
};

export class MercadoPagoApiError extends Error {
  constructor(message: string, public readonly httpStatus: number) {
    super(message);
    this.name = "MercadoPagoApiError";
  }
}

export type MercadoPagoPaymentFormData = {
  token?: string;
  payment_method_id?: string;
  issuer_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
};

// Subscription API helpers are kept server-side.
export async function createSubscription(params: {
  localSubscriptionId: string;
  userName: string;
  payerEmail: string;
  interval: PlanInterval;
  cardTokenId: string;
  backUrl: string;
}): Promise<MpSubscription> {
  const plan = PLAN_PRICES[params.interval];
  const body = {
    reason: `Dono da Pelada - Plano Pro ${plan.label} - ${params.userName}`,
    external_reference: params.localSubscriptionId,
    payer_email: params.payerEmail,
    card_token_id: params.cardTokenId,
    auto_recurring: {
      frequency: plan.frequency,
      frequency_type: "months",
      transaction_amount: plan.amount,
      currency_id: "BRL",
      free_trial: { frequency: 4, frequency_type: "days" }
    },
    back_url: params.backUrl,
    status: "authorized"
  };
  return postSubscription(body);
}

async function postSubscription(body: object): Promise<MpSubscription> {
  const response = await mercadoPagoFetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Mercado Pago rejeitou a assinatura.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload;
}

export async function getSubscription(subscriptionId: string): Promise<MpSubscription> {
  const response = await mercadoPagoFetch(`${MP_API}/preapproval/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Nao foi possivel consultar a assinatura.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload;
}

export async function findSubscriptionByReference(payerEmail: string, externalReference: string): Promise<MpSubscription | null> {
  const query = new URLSearchParams({ payer_email: payerEmail, limit: "100" });
  const response = await mercadoPagoFetch(`${MP_API}/preapproval/search?${query}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });
  const payload = await response.json().catch(() => null) as { results?: MpSubscription[] } | null;
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Nao foi possivel localizar a assinatura.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload?.results?.find((item) => String(item.external_reference || "") === externalReference) || null;
}

export async function cancelSubscription(subscriptionId: string): Promise<MpSubscription> {
  const response = await mercadoPagoFetch(`${MP_API}/preapproval/${encodeURIComponent(subscriptionId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json" },
    // Subscription preapprovals use the American-English status spelling.
    // Legacy /v1/payments cancellations below use "cancelled" instead.
    body: JSON.stringify({ status: "canceled" })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Nao foi possivel cancelar a assinatura.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload;
}

export async function getAuthorizedPayment(invoiceId: string): Promise<MpAuthorizedPayment> {
  const response = await mercadoPagoFetch(`${MP_API}/authorized_payments/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Nao foi possivel consultar a fatura.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload;
}

export async function findAuthorizedPaymentByPaymentId(paymentId: string): Promise<MpAuthorizedPayment | null> {
  const query = new URLSearchParams({ payment_id: paymentId, limit: "1" });
  const response = await mercadoPagoFetch(`${MP_API}/authorized_payments/search?${query}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });
  const payload = await response.json().catch(() => null) as { results?: MpAuthorizedPayment[] } | null;
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Nao foi possivel conciliar o pagamento.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload?.results?.[0] || null;
}

export async function findAuthorizedPaymentsBySubscriptionId(subscriptionId: string): Promise<MpAuthorizedPayment[]> {
  const query = new URLSearchParams({ preapproval_id: subscriptionId, limit: "20" });
  const response = await mercadoPagoFetch(`${MP_API}/authorized_payments/search?${query}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });
  const payload = await response.json().catch(() => null) as { results?: MpAuthorizedPayment[] } | null;
  if (!response.ok) {
    const message = formatMercadoPagoError(payload, "Nao foi possivel conciliar as faturas.");
    throw new MercadoPagoApiError(message, response.status);
  }
  return payload?.results || [];
}

export async function createPaymentCheckout(params: {
  userId: string;
  userName: string;
  payerEmail: string;
  interval: PlanInterval;
  backUrl: string;
  notificationUrl: string;
}): Promise<MpPreference> {
  const plan = PLAN_PRICES[params.interval];

  const response = await mercadoPagoFetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items: [
        {
          title: `Dono da Pelada - Plano Pro ${plan.label} - ${params.userName}`,
          quantity: 1,
          unit_price: plan.amount,
          currency_id: "BRL"
        }
      ],
      payer: { email: params.payerEmail },
      external_reference: params.userId,
      metadata: {
        user_id: params.userId,
        plan_interval: params.interval
      },
      back_urls: {
        success: params.backUrl,
        pending: `${params.backUrl}&pending=1`,
        failure: `${params.backUrl}&failure=1`
      },
      notification_url: params.notificationUrl,
      payment_methods: {
        installments: 5
      },
      statement_descriptor: "DONO DA PELADA"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mercado Pago rejeitou o checkout: ${text}`);
  }

  return response.json();
}

export async function getPayment(paymentId: string): Promise<MpPayment> {
  const response = await mercadoPagoFetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nao foi possivel consultar o pagamento: ${text}`);
  }

  return response.json();
}

export async function createAuthorizedPayment(params: {
  userId: string;
  userName: string;
  payerEmail: string;
  interval: PlanInterval;
  formData: MercadoPagoPaymentFormData;
  idempotencyKey: string;
}): Promise<MpPayment> {
  const plan = PLAN_PRICES[params.interval];
  const payerEmail = params.formData.payer?.email || params.payerEmail;

  const response = await mercadoPagoFetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey
    },
    body: JSON.stringify({
      transaction_amount: plan.amount,
      token: params.formData.token,
      description: `Dono da Pelada - Plano Pro ${plan.label} - ${params.userName}`,
      installments: Math.min(Number(params.formData.installments || 1), 5),
      payment_method_id: params.formData.payment_method_id,
      issuer_id: params.formData.issuer_id,
      payer: {
        email: payerEmail,
        identification: params.formData.payer?.identification
      },
      capture: false,
      external_reference: params.userId,
      metadata: {
        user_id: params.userId,
        plan_interval: params.interval
      },
      statement_descriptor: "DONO DA PELADA"
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatMercadoPagoError(payload, "Mercado Pago rejeitou os dados de pagamento."));
  }

  return payload;
}

export async function capturePayment(paymentId: string): Promise<MpPayment> {
  const response = await mercadoPagoFetch(`${MP_API}/v1/payments/${paymentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `capture-${paymentId}`
    },
    body: JSON.stringify({ capture: true })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatMercadoPagoError(payload, "Nao foi possivel capturar o pagamento."));
  }

  return payload;
}

export async function cancelAuthorizedPayment(paymentId: string): Promise<MpPayment> {
  const response = await mercadoPagoFetch(`${MP_API}/v1/payments/${paymentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `cancel-${paymentId}`
    },
    body: JSON.stringify({ status: "cancelled" })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatMercadoPagoError(payload, "Nao foi possivel cancelar a autorizacao de pagamento."));
  }

  return payload;
}

export function formatMercadoPagoError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { message?: string; error?: string; status?: number; cause?: Array<{ description?: string; code?: string }> };
  const cause = data.cause?.find((item) => item.description || item.code);
  return cause?.description || data.message || data.error || fallback;
}
