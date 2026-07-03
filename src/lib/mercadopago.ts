import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";

const MP_API = "https://api.mercadopago.com";

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

export async function createPaymentCheckout(params: {
  userId: string;
  userName: string;
  payerEmail: string;
  interval: PlanInterval;
  backUrl: string;
  notificationUrl: string;
}): Promise<MpPreference> {
  const plan = PLAN_PRICES[params.interval];

  const response = await fetch(`${MP_API}/checkout/preferences`, {
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
  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
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

  const response = await fetch(`${MP_API}/v1/payments`, {
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
  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
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
  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `cancel-${paymentId}`
    },
    body: JSON.stringify({ status: "canceled" })
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
