import Link from "next/link";
import { CalendarDays, Clock, Dices, ListChecks, Pencil, Plus, Shirt, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CloseFriendlyMatchForm } from "@/components/matches/CloseFriendlyMatchForm";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { MatchWhatsappShareLink } from "@/components/matches/MatchWhatsappShareLink";
import { closeMatch, deleteMatch } from "@/lib/actions";
import { TOTAL_CAPACITY } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { cn, formatDate, surfaceLabel } from "@/lib/utils";

function dateParts(date: Date) {
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);

  return { day, month, time };
}

const kindTabs = [
  { key: "todos", label: "Todos" },
  { key: "PELADA", label: "Peladinha" },
  { key: "AMISTOSO", label: "Amistoso" }
] as const;

function MatchBadge({ kind }: { kind: string }) {
  if (kind !== "AMISTOSO") return null;
  return <span className="rounded-[7px] bg-craque/20 px-2 py-0.5 text-[11px] font-black text-mata">Amistoso</span>;
}

function AdminActions({
  id,
  closed = false,
  kind = "PELADA",
  title = "",
  opponentName
}: {
  id: string;
  closed?: boolean;
  kind?: string;
  title?: string;
  opponentName?: string | null;
}) {
  const isFriendlyOpen = !closed && kind === "AMISTOSO";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Link href={`/matches/${id}/edit`} className="flex min-h-10 items-center justify-center gap-1 rounded-[11px] bg-white px-3 py-2 text-xs font-bold text-mata shadow-card">
          <Pencil size={14} /> Editar
        </Link>
        {closed ? (
          <Link href={`/matches/${id}/sumula`} className="flex min-h-10 items-center justify-center rounded-[11px] bg-areia px-3 py-2 text-xs font-bold">
            Sumula
          </Link>
        ) : isFriendlyOpen ? (
          <span className="flex min-h-10 items-center justify-center rounded-[11px] bg-areia px-3 py-2 text-center text-[11px] font-bold text-musgo">
            Placar abaixo
          </span>
        ) : (
          <form action={closeMatch.bind(null, id)}>
            <Button variant="ghost" className="w-full py-2 text-xs">Encerrar</Button>
          </form>
        )}
        <form action={deleteMatch.bind(null, id)}>
          <Button variant="danger" className="w-full py-2 text-xs">
            <Trash2 size={14} /> Excluir
          </Button>
        </form>
      </div>
      {isFriendlyOpen ? (
        <CloseFriendlyMatchForm matchId={id} homeName={title} awayName={opponentName || "Adversario"} />
      ) : null}
    </div>
  );
}

export default async function MatchesPage({
  searchParams
}: {
  searchParams?: Promise<{ aba?: string; tipo?: string }>;
}) {
  const user = await requireUser();
  const isAdmin = isPeladaAdmin(user);
  const query = await searchParams;
  const activeTab = query?.aba === "anteriores" ? "anteriores" : "proximas";
  const activeKind = kindTabs.find((tab) => tab.key === query?.tipo) ?? kindTabs[0];
  const matches = await prisma.match.findMany({
    where: {
      peladaId: user.peladaId!,
      deletedAt: null,
      status: activeTab === "proximas" ? "OPEN" : "CLOSED",
      ...(activeKind.key === "todos" ? {} : { kind: activeKind.key })
    },
    include: {
      _count: { select: { attendances: { where: { status: "CONFIRMED" } } } }
    },
    orderBy: { date: activeTab === "proximas" ? "asc" : "desc" },
    take: activeTab === "anteriores" ? 60 : undefined
  });

  const featured = activeTab === "proximas" ? matches[0] : null;
  const others = featured ? matches.filter((match) => match.id !== featured.id) : matches;

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Agenda</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Partidas</h1>
        </div>
        {isAdmin ? (
          <Link href="/matches/new" className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-campo text-white shadow-button" aria-label="Nova partida">
            <Plus size={20} />
          </Link>
        ) : null}
      </div>

      <Card className="mb-4 p-2">
        <div className="grid grid-cols-2 gap-1">
          <Link
            href={`/matches?aba=proximas&tipo=${activeKind.key}`}
            className={cn(
              "rounded-[10px] px-3 py-2 text-center text-sm font-bold",
              activeTab === "proximas" ? "bg-campo text-white" : "text-musgo"
            )}
          >
            Proximas
          </Link>
          <Link
            href={`/matches?aba=anteriores&tipo=${activeKind.key}`}
            className={cn(
              "rounded-[10px] px-3 py-2 text-center text-sm font-bold",
              activeTab === "anteriores" ? "bg-campo text-white" : "text-musgo"
            )}
          >
            Anteriores
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {kindTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/matches?aba=${activeTab}&tipo=${tab.key}`}
              className={cn(
                "rounded-[10px] px-2 py-2 text-center text-xs font-bold",
                activeKind.key === tab.key ? "bg-mata text-white" : "bg-areia text-musgo"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </Card>

      {featured ? (
        <Card className="mb-4 animate-card overflow-hidden p-0">
          <div className="field-hero p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-jersey text-xs font-semibold uppercase tracking-[.14em] text-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-craque" /> Aberta para confirmar
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-.02em]">{featured.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-green-100">
                  <span className="flex items-center gap-1">
                    <Clock size={15} /> {dateParts(featured.date).time}
                  </span>
                  <LocationLinks location={featured.location} />
                </div>
              </div>
              <div className="shrink-0 rounded-[13px] bg-white/15 px-3 py-2 text-center">
                <div className="font-jersey text-3xl font-bold leading-none">{dateParts(featured.date).day}</div>
                <div className="mt-1 text-[10px] font-bold uppercase leading-none">{dateParts(featured.date).month}</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-[11px] bg-areia px-3 py-2">
                <p className="text-[10px] font-black uppercase text-musgo">Confirmados</p>
                <p className="font-display text-lg font-extrabold text-campo">{featured._count.attendances}/{TOTAL_CAPACITY}</p>
              </div>
              <div className="rounded-[11px] bg-areia px-3 py-2">
                <p className="text-[10px] font-black uppercase text-musgo">Quadra</p>
                <p className="truncate text-sm font-bold text-mata">{surfaceLabel(featured.surface)}</p>
              </div>
              <div className="rounded-[11px] bg-areia px-3 py-2">
                <p className="text-[10px] font-black uppercase text-musgo">Tipo</p>
                <p className="truncate text-sm font-bold text-mata">{featured.kind === "AMISTOSO" ? "Amistoso" : "Peladinha"}</p>
              </div>
            </div>
            <div className={cn("grid gap-2", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
              <Link href={`/matches/${featured.id}/attendance`} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-campo px-3 py-2.5 text-center text-sm font-bold text-white">
                <ListChecks size={16} /> Presenca
              </Link>
              <Link href={`/matches/${featured.id}/teams`} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-areia px-3 py-2.5 text-center text-sm font-bold">
                <Shirt size={16} /> Times
              </Link>
              {isAdmin ? (
                <Link href={`/matches/${featured.id}/draw`} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-areia px-3 py-2.5 text-center text-sm font-bold">
                  <Dices size={16} /> Sortear
                </Link>
              ) : null}
            </div>
            {isAdmin ? (
              <MatchWhatsappShareLink
                matchId={featured.id}
                title={featured.title}
                time={dateParts(featured.date).time}
                location={featured.location}
                className="mt-2"
              />
            ) : null}
            {isAdmin ? (
              <div className="mt-2">
                <AdminActions id={featured.id} kind={featured.kind} title={featured.title} opponentName={featured.opponentName} />
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {others.map((match) => {
          const parts = dateParts(match.date);
          const closed = match.status === "CLOSED";
          return (
            <Card key={match.id} className="animate-card p-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-[12px] bg-areia px-3 py-2 text-center text-mata">
                  <div className="font-jersey text-2xl font-bold leading-none">{parts.day}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase leading-none">{parts.month}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate font-display text-lg font-bold">{match.title}</h2>
                    <MatchBadge kind={match.kind} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-musgo">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {parts.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} /> {formatDate(match.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {match._count.attendances}/{TOTAL_CAPACITY}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-musgo">{match.location || "Local a definir"}</p>
                </div>
                <span className={cn("rounded-[8px] px-2 py-1 text-[11px] font-black", closed ? "bg-linha text-musgo" : "bg-[#E5F3E8] text-mata")}>
                  {closed ? "Encerrada" : "Aberta"}
                </span>
              </div>
              <div className={cn("mt-3 grid gap-2", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
                <Link href={`/matches/${match.id}/attendance`} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  <ListChecks size={14} /> Presenca
                </Link>
                <Link href={`/matches/${match.id}/teams`} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  <Shirt size={14} /> Times
                </Link>
                {isAdmin ? (
                  <Link href={`/matches/${match.id}/sumula`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                    Sumula
                  </Link>
                ) : null}
              </div>
              {isAdmin && !closed ? (
                <MatchWhatsappShareLink
                  matchId={match.id}
                  title={match.title}
                  time={parts.time}
                  location={match.location}
                  className="mt-2 text-xs"
                />
              ) : null}
              {isAdmin ? (
                <div className="mt-2">
                  <AdminActions
                    id={match.id}
                    closed={closed}
                    kind={match.kind}
                    title={match.title}
                    opponentName={match.opponentName}
                  />
                </div>
              ) : null}
            </Card>
          );
        })}
        {!matches.length ? (
          <Card>
            <p className="text-sm text-musgo">
              {activeTab === "proximas" ? "Nenhuma partida aberta no momento." : "Nenhuma partida encerrada ainda."}
            </p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
