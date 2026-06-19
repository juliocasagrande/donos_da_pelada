import Link from "next/link";
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListPlus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CashFlowAreaChart } from "@/components/finance/CashFlowAreaChart";
import { DeleteTransactionForm } from "@/components/finance/DeleteTransactionForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { ProLockedCard } from "@/components/ui/ProLockedCard";
import { StatTile } from "@/components/ui/StatTile";
import { Switch } from "@/components/ui/Switch";
import { createTransaction, setMonthlyFee, setPlayerPaymentStatus } from "@/lib/financeActions";
import { formatCurrencyBRL, monthKey, monthLabel, parseMonthKey, shiftMonth } from "@/lib/financeUtils";
import { isPeladaIdPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";

const financeTabs = [
  { key: "resumo", label: "Resumo", icon: Wallet },
  { key: "mensalidades", label: "Mensal.", icon: CheckCircle2 },
  { key: "lancamentos", label: "Lanc.", icon: ListPlus },
  { key: "historico", label: "Historico", icon: CalendarRange }
] as const;

type FinanceTab = (typeof financeTabs)[number]["key"];

function financeHref(tab: FinanceTab, year: number, month: number) {
  return `/financeiro?mes=${monthKey(year, month)}&aba=${tab}`;
}

export default async function FinancePage({
  searchParams
}: {
  searchParams?: Promise<{ mes?: string; aba?: string }>;
}) {
  const admin = await requireAdmin();
  const peladaId = admin.peladaId!;
  const isPro = await isPeladaIdPro(peladaId);
  const query = await searchParams;
  const now = new Date();
  const { year, month } = parseMonthKey(query?.mes, { year: now.getFullYear(), month: now.getMonth() + 1 });
  const activeTab = (financeTabs.find((tab) => tab.key === query?.aba)?.key ?? "resumo") as FinanceTab;

  if (!isPro) {
    return (
      <AppShell>
        <div className="mb-5">
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Financeiro</h1>
        </div>
        <ProLockedCard feature="Financeiro" />
      </AppShell>
    );
  }

  const prevMonth = shiftMonth(year, month, -1);
  const nextMonth = shiftMonth(year, month, 1);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const todayInput = now.toISOString().slice(0, 10);

  const [feeConfig, players, allPayments, allTransactions] = await Promise.all([
    prisma.monthlyFeeConfig.findUnique({ where: { peladaId_year_month: { peladaId, year, month } } }),
    prisma.player.findMany({
      where: { peladaId, active: true, membershipStatus: "MENSALISTA" },
      orderBy: { nickname: "asc" }
    }),
    prisma.monthlyPayment.findMany({ where: { peladaId } }),
    prisma.transaction.findMany({ where: { peladaId }, orderBy: { date: "desc" } })
  ]);

  const currentPayments = allPayments.filter((payment) => payment.year === year && payment.month === month);
  const paidPlayerIds = new Set(currentPayments.map((payment) => payment.playerId));
  const currentTransactions = allTransactions.filter(
    (transaction) => transaction.date >= monthStart && transaction.date < monthEnd
  );

  const receivedFromFees = currentPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const incomeFromTransactions = currentTransactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = currentTransactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalReceived = receivedFromFees + incomeFromTransactions;
  const balance = totalReceived - expenses;
  const paidPercent = players.length ? Math.round((paidPlayerIds.size / players.length) * 100) : 0;

  const history = new Map<string, { label: string; received: number; spent: number }>();
  for (const payment of allPayments) {
    const key = monthKey(payment.year, payment.month);
    const entry = history.get(key) ?? { label: monthLabel(payment.year, payment.month), received: 0, spent: 0 };
    entry.received += payment.amount;
    history.set(key, entry);
  }
  for (const transaction of allTransactions) {
    const key = monthKey(transaction.date.getFullYear(), transaction.date.getMonth() + 1);
    const entry = history.get(key) ?? {
      label: monthLabel(transaction.date.getFullYear(), transaction.date.getMonth() + 1),
      received: 0,
      spent: 0
    };
    if (transaction.type === "INCOME") entry.received += transaction.amount;
    else entry.spent += transaction.amount;
    history.set(key, entry);
  }

  const historyRows = [...history.entries()].sort(([left], [right]) => (left < right ? 1 : -1)).slice(0, 12);
  const chronologicalKeys = [...history.keys()].sort();
  let runningBalance = 0;
  const cashFlowData = chronologicalKeys
    .map((key) => {
      const entry = history.get(key)!;
      runningBalance += entry.received - entry.spent;
      return { key, label: entry.label.slice(0, 3), balance: runningBalance };
    })
    .slice(-6);

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Caixa da pelada</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Financeiro</h1>
        </div>
        <div className={cn("rounded-[13px] px-3 py-2 text-right", balance >= 0 ? "bg-[#EAF5EC] text-campo" : "bg-[#FBE9E6] text-ausente")}>
          <p className="text-[10px] font-black uppercase">Saldo</p>
          <p className="font-jersey text-xl font-bold leading-none">{formatCurrencyBRL(balance)}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 rounded-[13px] bg-white px-2 py-2 shadow-card">
        <Link
          href={financeHref(activeTab, prevMonth.year, prevMonth.month)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-musgo"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} />
        </Link>
        <span className="font-bold">{monthLabel(year, month)}</span>
        <Link
          href={financeHref(activeTab, nextMonth.year, nextMonth.month)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-musgo"
          aria-label="Proximo mes"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <Card className="mb-4 p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {financeTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={financeHref(tab.key, year, month)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] px-1 py-2 text-center text-[11px] font-black",
                  active ? "bg-campo text-white" : "bg-areia text-musgo"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </Card>

      {activeTab === "resumo" ? (
        <>
          <Card className="mb-4">
            <h2 className="mb-2 font-display text-lg font-extrabold">Evolucao do caixa</h2>
            <CashFlowAreaChart data={cashFlowData} />
          </Card>

          <div className="stagger mb-4 grid grid-cols-2 gap-3">
            <StatTile icon={Wallet} value={formatCurrencyBRL(totalReceived)} label="Recebido no mes" />
            <StatTile icon={TrendingDown} value={formatCurrencyBRL(expenses)} label="Gastos no mes" accent="yellow" />
          </div>

          <Card className={cn("mb-4", balance >= 0 ? "border border-campo/20 bg-[#EAF5EC]" : "border border-ausente/30 bg-[#FBE9E6]")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-musgo">Saldo do mes</p>
                <p className={cn("font-jersey text-2xl font-bold", balance >= 0 ? "text-campo" : "text-ausente")}>
                  {formatCurrencyBRL(balance)}
                </p>
              </div>
              {balance >= 0 ? <TrendingUp className="text-campo" size={28} /> : <TrendingDown className="text-ausente" size={28} />}
            </div>
          </Card>
        </>
      ) : null}

      {activeTab === "mensalidades" ? (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 font-display text-lg font-extrabold">Valor da mensalidade</h2>
            <form action={setMonthlyFee.bind(null, year, month)} className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Valor para {monthLabel(year, month)}</Label>
                <Input name="amount" type="number" min={0} step={0.01} defaultValue={feeConfig?.amount ?? ""} placeholder="0,00" />
              </div>
              <Button type="submit">Salvar</Button>
            </form>
          </Card>

          <Card className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-extrabold">Mensalistas</p>
                <p className="text-sm text-musgo">{paidPlayerIds.size}/{players.length} pagaram</p>
              </div>
              <span className="rounded-[13px] bg-[#EAF5EC] px-3 py-2 font-jersey text-2xl font-bold text-campo">{paidPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-areia">
              <div className="h-full rounded-full bg-campo" style={{ width: `${paidPercent}%` }} />
            </div>
          </Card>

          <div className="space-y-2">
            {players.map((player) => {
              const paid = paidPlayerIds.has(player.id);
              return (
                <Card key={player.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{player.nickname}</h3>
                    <p className={cn("text-xs font-semibold", paid ? "text-campo" : "text-musgo")}>{paid ? "Pago" : "Pendente"}</p>
                  </div>
                  <form action={setPlayerPaymentStatus.bind(null, player.id, year, month, paid)}>
                    <Switch checked={paid} />
                  </form>
                </Card>
              );
            })}
            {!players.length ? (
              <Card>
                <p className="text-sm text-musgo">Nenhum mensalista ativo cadastrado.</p>
              </Card>
            ) : null}
          </div>
        </>
      ) : null}

      {activeTab === "lancamentos" ? (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 font-display text-lg font-extrabold">Novo lancamento</h2>
            <form action={createTransaction} className="space-y-3">
              <div>
                <Label>Descricao</Label>
                <Input name="description" placeholder="Bola nova, pagamento avulso..." required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor</Label>
                  <Input name="amount" type="number" min={0.01} step={0.01} required />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select name="type" defaultValue="EXPENSE">
                    <option value="EXPENSE">Saida</option>
                    <option value="INCOME">Entrada</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data</Label>
                <Input name="date" type="date" defaultValue={todayInput} required />
              </div>
              <Button type="submit" className="w-full">
                <ReceiptText size={16} /> Adicionar lancamento
              </Button>
            </form>
          </Card>

          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-display text-lg font-extrabold">Lancamentos do mes</h2>
            <span className="text-sm font-semibold text-musgo">{currentTransactions.length}</span>
          </div>
          <div className="space-y-2">
            {currentTransactions.map((transaction) => (
              <Card key={transaction.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{transaction.description}</h3>
                  <p className="text-xs text-musgo">{formatDate(transaction.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-jersey text-lg font-bold", transaction.type === "INCOME" ? "text-campo" : "text-ausente")}>
                    {transaction.type === "INCOME" ? "+" : "-"}
                    {formatCurrencyBRL(transaction.amount)}
                  </span>
                  <DeleteTransactionForm transactionId={transaction.id} description={transaction.description} />
                </div>
              </Card>
            ))}
            {!currentTransactions.length ? (
              <Card>
                <p className="text-sm text-musgo">Nenhum lancamento avulso neste mes.</p>
              </Card>
            ) : null}
          </div>
        </>
      ) : null}

      {activeTab === "historico" ? (
        <div className="space-y-2">
          {historyRows.map(([key, entry]) => {
            const monthBalance = entry.received - entry.spent;
            return (
              <Card key={key} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{entry.label}</p>
                    <p className="text-xs text-musgo">
                      Entradas {formatCurrencyBRL(entry.received)} - Saidas {formatCurrencyBRL(entry.spent)}
                    </p>
                  </div>
                  <span className={cn("font-jersey text-lg font-bold", monthBalance >= 0 ? "text-campo" : "text-ausente")}>
                    {formatCurrencyBRL(monthBalance)}
                  </span>
                </div>
              </Card>
            );
          })}
          {!historyRows.length ? (
            <Card>
              <p className="text-sm text-musgo">Sem historico financeiro ainda.</p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
