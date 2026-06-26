import Link from "next/link";
import { ArrowLeft, Check, DollarSign, Lock, Shield, ShieldCheck, Star, Users, Wallet } from "lucide-react";
import { MercadoPagoPaymentBrick } from "@/components/payment/MercadoPagoPaymentBrick";
import { Button } from "@/components/ui/Button";
import { PeladaCrest } from "@/components/ui/PeladaCrest";
import { formatCurrencyBRL } from "@/lib/financeUtils";
import { cancelProPeriod } from "@/lib/mercadopagoActions";
import { PLAN_PRICES, getOwnerProPeladaIds, isUserPro, type PlanInterval } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { requireUser } from "@/lib/session";
import { syncUserPaymentByUserId } from "@/lib/mercadopagoSync";

const planOrder: PlanInterval[] = ["anual", "trimestral", "mensal"];

const planCopy: Record<PlanInterval, { monthly: string; suffix: string; detail: string; description: string }> = {
  anual: {
    monthly: "24",
    suffix: ",90",
    detail: "/mes · R$ 298,80/ano",
    description: "O pacote completo pelo menor preco mensal."
  },
  trimestral: {
    monthly: "26",
    suffix: ",90",
    detail: "/mes · R$ 80,70/trim.",
    description: "Bom para testar o Pro por uma temporada."
  },
  mensal: {
    monthly: "29",
    suffix: ",90",
    detail: "/mes",
    description: "Flexivel, com cobranca mensal."
  }
};

function normalizePlan(plan?: string): PlanInterval {
  return plan === "mensal" || plan === "trimestral" || plan === "anual" ? plan : "anual";
}

function nextRenewal(plan: PlanInterval) {
  const months = PLAN_PRICES[plan].frequency;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

function PaymentShell({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return (
    <main className={success ? "min-h-screen bg-areia text-tinta" : "light-field-lines min-h-screen bg-areia text-tinta"}>
      <div className="mx-auto min-h-screen w-full max-w-md overflow-hidden bg-areia">
        {children}
      </div>
    </main>
  );
}

function StatusBar({ light = false, rightOnly = false }: { light?: boolean; rightOnly?: boolean }) {
  return (
    <div className={`flex items-center ${rightOnly ? "justify-end" : "justify-between"} px-7 pt-4 ${light ? "text-white" : "text-tinta"}`}>
      {!rightOnly ? <span className="font-jersey text-[15px] font-bold">20:45</span> : null}
      <span className="flex items-center gap-1.5">
        <span className="flex h-3.5 items-end gap-0.5">
          <span className={`h-[5px] w-[3px] rounded-sm ${light ? "bg-white" : "bg-tinta"}`} />
          <span className={`h-2 w-[3px] rounded-sm ${light ? "bg-white" : "bg-tinta"}`} />
          <span className={`h-3 w-[3px] rounded-sm ${light ? "bg-white/60" : "bg-tinta"}`} />
        </span>
        <span className={`h-3 w-6 rounded-[4px] border ${light ? "border-white/60" : "border-tinta/50"} p-[2px]`}>
          <span className={`block h-full w-3.5 rounded-[2px] ${light ? "bg-white" : "bg-tinta"}`} />
        </span>
      </span>
    </div>
  );
}

function Header() {
  return (
    <>
      <StatusBar />
      <div className="flex items-center gap-3 px-[22px] pb-3 pt-3">
        <Link href="/dashboard" className="text-tinta">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-display text-[23px] font-extrabold tracking-[-.02em]">Pagamento</h1>
      </div>
    </>
  );
}

function ActivePeladaCard({
  name,
  status,
  activeMensalistas,
  proCoverage
}: {
  name: string;
  status: string;
  activeMensalistas: number;
  proCoverage?: string;
}) {
  return (
    <div className="flex items-center gap-[13px] rounded-[18px] bg-white p-3.5 shadow-card">
      <PeladaCrest size={48} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-base font-bold text-tinta">{name}</h2>
        <p className="mt-0.5 text-[12.5px] text-musgo">
          Plano atual: <span className="font-semibold text-tinta">{status}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-musgo">
          Mensalistas ativos: <span className="font-semibold text-tinta">{activeMensalistas}</span>
        </p>
        {proCoverage ? (
          <p className="mt-0.5 text-[12px] text-musgo">
            Peladas Pro: <span className="font-semibold text-tinta">{proCoverage}</span>
          </p>
        ) : null}
      </div>
      <span className="rounded-md bg-areia px-2.5 py-1 text-[10px] font-bold text-musgo">ATIVA</span>
    </div>
  );
}

function PlanCard({ planKey, selected }: { planKey: PlanInterval; selected: boolean }) {
  const featured = planKey === "anual";
  const plan = PLAN_PRICES[planKey];
  const copy = planCopy[planKey];
  const installmentAmount = plan.amount / 5;
  const cardClass = selected
    ? "relative rounded-[18px] border-2 border-campo bg-white p-[15px] shadow-[0_8px_22px_rgba(27,158,75,.18)]"
    : featured
      ? "relative rounded-[18px] border-2 border-campo bg-white p-[15px] shadow-[0_8px_22px_rgba(27,158,75,.14)]"
      : "rounded-[18px] border-[1.5px] border-linha bg-white p-[15px]";

  return (
    <div className={cardClass}>
      {featured ? (
        <div className="absolute -top-2.5 left-[15px] flex items-center gap-1 rounded-md bg-craque px-2.5 py-1 text-[10px] font-bold tracking-[.04em] text-tinta">
          <Star size={11} fill="#16261D" /> MELHOR VALOR
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-extrabold text-tinta">{plan.label}</h2>
          <p className="mt-1 text-[12.5px] leading-snug text-musgo">{copy.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="text-[13px] font-semibold text-musgo">R$</span>
            <span className="font-jersey text-[30px] font-bold leading-none text-tinta">{copy.monthly}</span>
            <span className="font-jersey text-lg font-bold text-musgo">{copy.suffix}</span>
          </div>
          <div className="text-[11px] text-[#A7AFA1]">{copy.detail}</div>
          <div className="text-[11px] font-semibold text-campo">ate 5x de {formatCurrencyBRL(installmentAmount)}</div>
        </div>
      </div>
      <Link
        href={`/pagamento?plano=${planKey}`}
        className={
          selected || featured
            ? "mt-[13px] flex w-full items-center justify-center gap-2 rounded-xl bg-campo p-[13px] text-sm font-bold text-white shadow-[0_8px_18px_rgba(27,158,75,.28)] transition active:scale-[.98]"
            : "mt-[13px] flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-campo bg-white p-3 text-sm font-bold text-campo transition active:scale-[.98]"
        }
      >
        <Wallet size={17} /> {selected ? "Plano selecionado" : "Selecionar plano"}
      </Link>
    </div>
  );
}

function ProBenefits() {
  const benefits = [
    { icon: DollarSign, title: "Financeiro completo", subtitle: "Mensalidades, caixa e relatorios" },
    { icon: ShieldCheck, title: "Amistosos entre peladas", subtitle: "Marque jogos com outros grupos" },
    { icon: Users, title: "Mais de 20 mensalistas", subtitle: "Grupos grandes sem limite" }
  ];

  return (
    <div className="field-hero rounded-[18px] bg-mata p-4 text-white">
      <div className="relative">
        <div className="flex items-center gap-2 font-jersey text-xs font-semibold uppercase tracking-[.1em] text-craque">
          <Star size={13} fill="#F4A11A" /> O Pro libera
        </div>
        <div className="mt-[13px] space-y-[11px]">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex items-center gap-[11px]">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-white/10">
                <benefit.icon size={16} className="text-[#9fe3b8]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{benefit.title}</div>
                <div className="text-xs text-[#9fe3b8]">{benefit.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SevenDayNotice() {
  return (
    <div className="rounded-[13px] border border-craque/30 bg-[#FFF7E6] px-3 py-2 text-center text-xs font-semibold text-[#8a5a06]">
      Voce tem 7 dias de cancelamento gratuito.
    </div>
  );
}

function SubscriptionPanel({
  user
}: {
  user: {
    plan: string;
    proCancelUntil: Date | null;
    proRenewsAt: Date | null;
    subscriptionCancelledAt: Date | null;
    mpPaymentId: string | null;
  };
}) {
  const now = Date.now();
  const pro = isUserPro(user);
  const inFreeCancellationPeriod = Boolean(user.proCancelUntil && user.proCancelUntil.getTime() > now);
  const alreadyCancelled = Boolean(user.subscriptionCancelledAt);

  if (!pro && !user.mpPaymentId && !alreadyCancelled) return null;

  return (
    <div className="mt-3 rounded-[18px] border border-linha bg-white p-3.5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF5EC]">
          <ShieldCheck size={20} className="text-campo" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-tinta">
            {alreadyCancelled && pro ? "Periodo Pro cancelado" : pro ? "Periodo Pro ativo" : "Periodo Pro cancelado"}
          </h2>
          <p className="mt-1 text-xs leading-snug text-musgo">
            {alreadyCancelled && !pro
              ? "Periodo Pro cancelado dentro da janela gratuita."
              : inFreeCancellationPeriod
                ? `Cancelamento gratuito disponivel ate ${formatDate(user.proCancelUntil!)}.`
                : user.proRenewsAt
                  ? `Fora do periodo gratuito. O Pro fica ativo ate ${formatDate(user.proRenewsAt)}.`
                  : "Periodo Pro sem cobranca recorrente."}
          </p>
        </div>
      </div>

      {!alreadyCancelled && pro && inFreeCancellationPeriod ? (
        <form action={cancelProPeriod} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-[13px] border-[1.5px] border-ausente/30 bg-white px-4 py-3 text-sm font-bold text-ausente transition active:scale-[.98]"
          >
            Cancelar periodo Pro gratis
          </button>
        </form>
      ) : null}
    </div>
  );
}

function PlansScreen({
  peladaName,
  user,
  status,
  cancelado,
  selectedPlan,
  activeMensalistas,
  proCoverage
}: {
  peladaName: string;
  user: {
    plan: string;
    proCancelUntil: Date | null;
    proRenewsAt: Date | null;
    subscriptionCancelledAt: Date | null;
    mpPaymentId: string | null;
    mpPaymentError?: string | null;
  };
  status: string;
  cancelado?: string;
  selectedPlan?: PlanInterval;
  activeMensalistas: number;
  proCoverage?: string;
}) {
  return (
    <PaymentShell>
      <Header />
      <div className="h-[716px] overflow-y-auto px-[22px] pb-5">
        <ActivePeladaCard name={peladaName} status={status} activeMensalistas={activeMensalistas} proCoverage={proCoverage} />
        {cancelado ? (
          <div className="mt-3 rounded-[13px] border border-campo/20 bg-[#EAF5EC] px-3 py-2 text-center text-xs font-semibold text-mata">
            {cancelado === "erro"
              ? user.mpPaymentError || "Nao foi possivel cancelar no Mercado Pago. Tente novamente."
              : cancelado === "gratis"
              ? "Periodo Pro cancelado dentro da janela gratuita."
              : "Fora do periodo gratuito. O Pro fica ativo ate o vencimento."}
          </div>
        ) : null}
        <SubscriptionPanel user={user} />
        <div className="mb-[11px] mt-[18px] px-0.5 font-jersey text-xs font-semibold uppercase tracking-[.1em] text-[#8a857a]">
          Escolha o plano
        </div>
        <div className="space-y-[11px]">
          {planOrder.map((plan) => <PlanCard key={plan} planKey={plan} selected={selectedPlan === plan} />)}
        </div>
        {selectedPlan ? (
          <div className="mt-3">
            <MercadoPagoPaymentBrick interval={selectedPlan} />
          </div>
        ) : null}
        <div className="mt-3">
          <SevenDayNotice />
        </div>
        <div className="mt-3">
          <ProBenefits />
        </div>
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11.5px] text-[#A7AFA1]">
          <Lock size={13} /> Pagamento seguro processado pelo Mercado Pago
        </div>
      </div>
    </PaymentShell>
  );
}

function ProcessingScreen({ peladaName, plan }: { peladaName: string; plan: PlanInterval }) {
  const currentPlan = PLAN_PRICES[plan];
  const label = `${currentPlan.label}`;

  return (
    <PaymentShell>
      <StatusBar />
      <div className="flex h-[760px] flex-col items-center justify-center px-[30px]">
        <div className="relative h-[118px] w-[118px] rounded-full border-[3px] border-linha">
          <div className="absolute -inset-[3px] rounded-full border-[3px] border-transparent border-t-campo animate-spin" />
          <div className="absolute inset-[18px] flex items-center justify-center rounded-full bg-gradient-to-br from-mata to-campo">
            <Wallet size={38} className="text-white" />
            <span className="absolute right-[33px] top-[56px] h-2.5 w-2.5 rounded-full bg-craque" />
          </div>
        </div>
        <h1 className="mt-[30px] text-center font-display text-[22px] font-extrabold leading-tight tracking-[-.02em] text-tinta">
          Redirecionando para<br />o Mercado Pago
        </h1>
        <p className="mt-2 text-center text-sm leading-snug text-musgo">
          Nao feche o app. Voce volta automaticamente<br />apos concluir o pagamento.
        </p>
        <p className="mt-2 rounded-[10px] bg-[#FFF7E6] px-3 py-2 text-center text-xs font-semibold text-[#8a5a06]">
          Compra avulsa. Sem cobranca recorrente.
        </p>
        <div className="mt-[18px] flex gap-[7px]">
          <span className="pulse-dot h-2 w-2 rounded-full bg-campo" />
          <span className="pulse-dot h-2 w-2 rounded-full bg-campo [animation-delay:.2s]" />
          <span className="pulse-dot h-2 w-2 rounded-full bg-campo [animation-delay:.4s]" />
        </div>
        <div className="mt-[38px] w-full rounded-[18px] bg-white p-[15px] shadow-card">
          <div className="flex items-center gap-3">
            <PeladaCrest size={42} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-tinta">{peladaName}</div>
              <div className="mt-px text-xs text-musgo">Plano Pro · {label}</div>
            </div>
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-px">
                <span className="text-[11px] font-semibold text-musgo">R$</span>
                <span className="font-jersey text-xl font-bold leading-none text-tinta">
                  {Math.floor(currentPlan.amount)}
                </span>
                <span className="font-jersey text-sm font-bold text-musgo">
                  ,{String(Math.round((currentPlan.amount % 1) * 100)).padStart(2, "0")}
                </span>
              </div>
              <div className="text-[10px] text-[#A7AFA1]">cobranca {plan === "anual" ? "anual" : plan === "trimestral" ? "trimestral" : "mensal"}</div>
            </div>
          </div>
        </div>
        <Link href="/pagamento" className="mt-[22px] text-xs text-[#A7AFA1] underline">
          Cancelar
        </Link>
      </div>
    </PaymentShell>
  );
}

function SuccessScreen({
  peladaName,
  plan,
  proRenewsAt
}: {
  peladaName: string;
  plan: PlanInterval;
  proRenewsAt: Date;
}) {
  const currentPlan = PLAN_PRICES[plan];

  return (
    <PaymentShell success>
      <div className="field-hero relative h-[340px] bg-gradient-to-br from-mata to-campo">
        <StatusBar light rightOnly />
        <div className="relative mt-[42px] text-center">
          <div className="mx-auto flex h-[90px] w-[90px] items-center justify-center rounded-full bg-white shadow-[0_14px_30px_rgba(0,0,0,.18)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-campo">
              <Check size={34} strokeWidth={3} className="text-white" />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-craque/20 px-3 py-1.5 font-jersey text-xs font-semibold uppercase tracking-[.12em] text-craque">
            <Star size={12} fill="#F4A11A" /> Plano Pro
          </div>
          <h1 className="mt-3 font-display text-[27px] font-extrabold tracking-[-.02em] text-white">Plano Pro ativado!</h1>
          <p className="mt-1 text-sm text-[#cdeed9]">A pelada agora tem tudo desbloqueado.</p>
        </div>
      </div>

      <div className="-mt-[-52px] px-5">
        <div className="rounded-[20px] bg-white p-[18px] shadow-[0_8px_24px_rgba(17,40,28,.1)]">
          <div className="flex items-center gap-3 border-b border-linha pb-3.5">
            <PeladaCrest size={48} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-base font-bold text-tinta">{peladaName}</h2>
              <p className="text-xs text-musgo">Upgrade confirmado</p>
            </div>
            <Shield size={22} className="text-campo" />
          </div>
          <div className="space-y-[11px] pt-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-musgo">Plano</span>
              <span className="text-sm font-bold text-tinta">Pro · {currentPlan.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-musgo">Valor contratado</span>
              <span className="font-jersey text-[17px] font-bold text-tinta">{formatCurrencyBRL(currentPlan.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-musgo">Valido ate</span>
              <span className="text-sm font-bold text-tinta">{formatDate(proRenewsAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-musgo">Pagamento</span>
              <span className="flex items-center gap-1 text-[13px] font-bold text-campo">
                <Check size={13} strokeWidth={2.5} /> Mercado Pago
              </span>
            </div>
          </div>
        </div>
        <Link href="/dashboard" className="mt-3.5 block">
          <Button type="button" className="w-full py-4 text-base">Voltar ao dashboard</Button>
        </Link>
        <Link
          href="/financeiro"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-linha bg-white p-3.5 text-[15px] font-semibold text-tinta"
        >
          <DollarSign size={18} className="text-campo" /> Abrir financeiro
        </Link>
      </div>
    </PaymentShell>
  );
}

export default async function PagamentoPage({
  searchParams
}: {
  searchParams?: Promise<{
    status?: string;
    flow?: string;
    plano?: string;
    cancelado?: string;
    payment_id?: string;
    collection_id?: string;
    collection_status?: string;
  }>;
}) {
  const currentUser = await requireUser();
  const query = await searchParams;
  const plan = normalizePlan(query?.plano);
  const paymentReturn =
    query?.flow === "sucesso" ||
    query?.status === "sucesso" ||
    query?.collection_status === "approved" ||
    Boolean(query?.payment_id || query?.collection_id);

  if (paymentReturn) {
    await syncUserPaymentByUserId(currentUser.id, query?.payment_id || query?.collection_id);
  }

  const [user, activePelada, activeMensalistas, ownedPeladasCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        name: true,
        plan: true,
        proCancelUntil: true,
        proRenewsAt: true,
        subscriptionCancelledAt: true,
        mpPaymentId: true,
        mpPaymentError: true,
        mpPaymentStatus: true
      }
    }),
    currentUser.peladaId
      ? prisma.pelada.findUnique({ where: { id: currentUser.peladaId }, select: { name: true, trialEndsAt: true } })
      : Promise.resolve(null),
    currentUser.peladaId
      ? prisma.player.count({ where: { peladaId: currentUser.peladaId, active: true, membershipStatus: "MENSALISTA" } })
      : Promise.resolve(0),
    prisma.pelada.count({ where: { createdByUserId: currentUser.id } })
  ]);

  if (!user) return null;
  const peladaName = activePelada?.name || user.name || "Sua pelada";

  if (query?.status === "processando") return <ProcessingScreen peladaName={peladaName} plan={plan} />;
  const pro = isUserPro(user);
  if (paymentReturn) {
    if (!pro) return <ProcessingScreen peladaName={peladaName} plan={plan} />;
    return (
      <SuccessScreen
        peladaName={peladaName}
        plan={plan}
        proRenewsAt={user.proRenewsAt || nextRenewal(plan)}
      />
    );
  }

  const status = pro
    ? user.plan === "PRO_IN_PROGRESS"
      ? "Pro em andamento"
      : "Pro"
    : activePelada?.trialEndsAt && activePelada.trialEndsAt.getTime() > Date.now()
      ? "Teste Pro"
      : "Gratis";
  const selectedPlan = query?.plano ? plan : undefined;
  const proCoverage =
    pro && ownedPeladasCount > 0
      ? `${(await getOwnerProPeladaIds(currentUser.id)).size} de ${ownedPeladasCount}`
      : undefined;

  return (
    <PlansScreen
      peladaName={peladaName}
      user={user}
      status={status}
      cancelado={query?.cancelado}
      selectedPlan={selectedPlan}
      activeMensalistas={activeMensalistas}
      proCoverage={proCoverage}
    />
  );
}
