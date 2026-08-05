import { NextResponse } from "next/server";
import { z } from "zod";
import { createSubscription, formatMercadoPagoError, MercadoPagoApiError } from "@/lib/mercadopago";
import { SUBSCRIPTION_TRIAL_DAYS, syncSubscriptionFromMercadoPago, syncSubscriptionById } from "@/lib/mercadopagoSubscriptionSync";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { ApiAuthError, requireApiUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

const requestSchema = z.object({
  interval: z.enum(["mensal", "trimestral", "anual"]),
  idempotencyKey: z.string().uuid(),
  formData: z.object({
    token: z.string().min(1),
    payer: z.object({ email: z.string().email().optional() }).optional()
  }).passthrough()
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function publicOrigin(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  return configured || new URL(request.url).origin;
}

function subscriptionResponse(status: string, interval: PlanInterval) {
  if (status === "authorized") {
    return NextResponse.json({ ok: true, status, url: `/pagamento?flow=sucesso&plano=${interval}` });
  }
  if (status === "failed" || status === "cancelled") {
    return NextResponse.json({ error: "A assinatura nao esta ativa.", status }, { status: 409 });
  }
  return NextResponse.json(
    { ok: true, processing: true, status, url: `/pagamento?status=processando&plano=${interval}` },
    { status: 202 }
  );
}

export async function POST(request: Request) {
  let localSubscriptionId: string | null = null;
  try {
    const currentUser = await requireApiUser();
    const payload = requestSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: payload.error.issues[0]?.message || "Dados de pagamento invalidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    const interval = payload.data.interval as PlanInterval;
    const payerEmail = payload.data.formData.payer?.email || user.email;
    if (!payerEmail) {
      return NextResponse.json({ error: "Informe um email valido para a assinatura." }, { status: 400 });
    }

    const repeated = await prisma.mercadoPagoSubscription.findUnique({ where: { requestKey: payload.data.idempotencyKey } });
    if (repeated) {
      if (repeated.userId !== user.id || repeated.interval !== interval) {
        return NextResponse.json({ error: "Chave de requisicao invalida." }, { status: 409 });
      }
      if (repeated.externalId) await syncSubscriptionById(repeated.externalId);
      const refreshed = await prisma.mercadoPagoSubscription.findUnique({ where: { id: repeated.id } });
      return subscriptionResponse(refreshed?.status || repeated.status, interval);
    }

    const active = await prisma.mercadoPagoSubscription.findUnique({ where: { activeKey: user.id } });
    if (active) {
      if (active.externalId) await syncSubscriptionById(active.externalId);
      const refreshed = await prisma.mercadoPagoSubscription.findUnique({ where: { id: active.id } });
      if (refreshed?.activeKey) {
        if (refreshed.status === "creating" || refreshed.status === "pending") {
          return subscriptionResponse(refreshed.status, interval);
        }
        return NextResponse.json({ error: "Ja existe uma assinatura ativa." }, { status: 409 });
      }
    }
    if (user.proRenewsAt && user.proRenewsAt > new Date()) {
      return NextResponse.json({ error: "Seu periodo Pro atual ainda esta vigente. Assine novamente apos o vencimento." }, { status: 409 });
    }

    const now = new Date();
    const local = await prisma.mercadoPagoSubscription.create({
      data: {
        userId: user.id,
        activeKey: user.id,
        requestKey: payload.data.idempotencyKey,
        payerEmail,
        interval,
        amount: PLAN_PRICES[interval].amount,
        trialEndsAt: addDays(now, SUBSCRIPTION_TRIAL_DAYS),
        previousProRenewsAt: user.proRenewsAt
      }
    });
    localSubscriptionId = local.id;

    const remote = await createSubscription({
      localSubscriptionId: local.id,
      userName: user.name || user.email || "Usuario",
      payerEmail,
      interval,
      cardTokenId: payload.data.formData.token,
      backUrl: `${publicOrigin(request)}/pagamento?flow=retorno&plano=${interval}`
    });
    await syncSubscriptionFromMercadoPago(remote);
    return subscriptionResponse(remote.status, interval);
  } catch (error) {
    return handleSubscriptionError(error, localSubscriptionId);
  }
}

async function handleSubscriptionError(error: unknown, localSubscriptionId: string | null) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "Ja existe uma assinatura ativa ou em processamento." }, { status: 409 });
  }
  const message = formatMercadoPagoError(
    error,
    error instanceof Error ? error.message : "Falha ao criar assinatura."
  );
  if (localSubscriptionId) {
    if (error instanceof MercadoPagoApiError) {
      await prisma.mercadoPagoSubscription.update({
        where: { id: localSubscriptionId },
        data: { status: "failed", activeKey: null, error: message }
      });
      return NextResponse.json({ error: message }, { status: error.httpStatus >= 500 ? 502 : 402 });
    }

    await prisma.mercadoPagoSubscription.update({
      where: { id: localSubscriptionId },
      data: { error: message }
    }).catch(() => null);
    return NextResponse.json(
      {
        ok: true,
        processing: true,
        status: "creating",
        message: "A confirmacao ainda esta sendo conciliada. Nao envie o cartao novamente.",
        url: "/pagamento?status=processando"
      },
      { status: 202 }
    );
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
