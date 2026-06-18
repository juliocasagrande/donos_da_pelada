import Link from "next/link";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { closeMatch, deleteMatch } from "@/lib/actions";
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
      status: activeTab === "proximas" ? "OPEN" : "CLOSED",
      ...(activeKind.key === "todos" ? {} : { kind: activeKind.key })
    },
    include: {
      attendances: { where: { status: "CONFIRMED" } },
      _count: { select: { teams: true } }
    },
    orderBy: { date: activeTab === "proximas" ? "asc" : "desc" }
  });

  const featured = activeTab === "proximas" ? matches[0] : null;
  const others = featured ? matches.filter((match) => match.id !== featured.id) : matches;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between pt-1">
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Peladas</h1>
        {isAdmin ? (
          <Link href="/matches/new">
            <Button className="h-11 w-11 rounded-[13px] px-0 shadow-button" aria-label="Nova pelada">
              <Plus size={20} />
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {kindTabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/matches?aba=${activeTab}&tipo=${tab.key}`}
            className={cn(
              "rounded-[10px] px-2 py-2 text-center text-xs font-bold shadow-sm",
              activeKind.key === tab.key ? "bg-campo text-white" : "bg-white text-musgo"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-[13px] bg-white p-1 shadow-card">
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

      {featured ? (
        <Card className="mb-3 animate-card overflow-hidden p-0">
          <div className="bg-gradient-to-br from-mata to-campo p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 flex items-center gap-1.5 font-jersey text-xs font-semibold uppercase tracking-[.14em] text-craque">
                  <span className="h-1.5 w-1.5 rounded-full bg-craque" /> Aberta para confirmar
                </p>
                <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">{featured.title}</h2>
              </div>
              <div className="rounded-[10px] bg-white/15 px-3 py-2 text-center">
                <div className="font-jersey text-3xl font-bold">{dateParts(featured.date).day}</div>
                <div className="text-[10px] font-bold uppercase">{dateParts(featured.date).month}</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-musgo">
              <span className="flex items-center gap-1"><Clock size={15} /> {dateParts(featured.date).time}</span>
              <LocationLinks location={featured.location} />
              <span className="rounded-[7px] bg-areia px-2 py-0.5 text-xs font-bold text-mata">{surfaceLabel(featured.surface)}</span>
              {featured.kind === "AMISTOSO" ? (
                <span className="rounded-[7px] bg-craque/20 px-2 py-0.5 text-xs font-bold text-mata">Amistoso</span>
              ) : null}
            </div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center -space-x-1">
                <span className="h-5 w-5 rounded-full bg-campo ring-2 ring-white" />
                <span className="h-5 w-5 rounded-full bg-craque ring-2 ring-white" />
                <span className="h-5 w-5 rounded-full bg-mata ring-2 ring-white" />
              </div>
              <span className="text-sm text-musgo">{featured.attendances.length}/20</span>
              <Link
                href={`/matches/${featured.id}/attendance`}
                className="rounded-[13px] bg-tinta px-5 py-2.5 text-sm font-bold text-white"
              >
                Confirmar
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {isAdmin ? (
                <Link href={`/matches/${featured.id}/draw`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  Sortear
                </Link>
              ) : null}
              <Link href={`/matches/${featured.id}/teams`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                Times
              </Link>
              {isAdmin ? (
                <Link href={`/matches/${featured.id}/stats`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  Sumula
                </Link>
              ) : null}
            </div>
            {isAdmin ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Link href={`/matches/${featured.id}/edit`} className="flex min-h-10 items-center justify-center rounded-[11px] bg-white px-3 py-2 text-xs font-bold text-mata shadow-card">
                  <Pencil size={14} /> Editar
                </Link>
                <form action={closeMatch.bind(null, featured.id)}>
                  <Button variant="ghost" className="w-full py-2 text-xs">Encerrar</Button>
                </form>
                <form action={deleteMatch.bind(null, featured.id)}>
                  <Button variant="danger" className="w-full py-2 text-xs"><Trash2 size={14} /> Excluir</Button>
                </form>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {others.map((match) => {
          const parts = dateParts(match.date);
          return (
            <Card key={match.id} className="animate-card p-3">
              <div className="flex items-center gap-3">
                <div className="rounded-[10px] bg-areia px-3 py-2 text-center text-mata">
                  <div className="font-jersey text-2xl font-bold leading-none">{parts.day}</div>
                  <div className="mt-1 text-[10px] uppercase leading-none">{parts.month}</div>
                </div>
                <Link href={`/matches/${match.id}/attendance`} className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-bold">
                    {match.title}
                    {match.kind === "AMISTOSO" ? (
                      <span className="ml-1.5 rounded-[6px] bg-craque/20 px-1.5 py-0.5 text-[10px] font-bold text-mata">Amistoso</span>
                    ) : null}
                  </h2>
                  <p className="truncate text-xs text-musgo">
                    {parts.time} · {match.location || "Local a definir"} · {formatDate(match.date)}
                  </p>
                </Link>
                <span className="rounded-[8px] bg-[#E5F3E8] px-3 py-1 text-xs font-bold text-mata">
                  {match.status === "OPEN" ? "Agendada" : "Encerrada"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Link href={`/matches/${match.id}/attendance`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  Detalhes
                </Link>
                <Link href={`/matches/${match.id}/teams`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  Times
                </Link>
                <Link href={`/matches/${match.id}/stats`} className="rounded-[11px] bg-areia px-3 py-2 text-center text-xs font-bold">
                  Sumula
                </Link>
              </div>
              {isAdmin ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href={`/matches/${match.id}/edit`} className="flex min-h-10 items-center justify-center gap-1 rounded-[11px] bg-white px-3 py-2 text-xs font-bold text-mata shadow-card">
                    <Pencil size={14} /> Editar
                  </Link>
                  <form action={deleteMatch.bind(null, match.id)}>
                    <Button variant="danger" className="w-full py-2 text-xs"><Trash2 size={14} /> Excluir</Button>
                  </form>
                </div>
              ) : null}
            </Card>
          );
        })}
        {!matches.length ? (
          <Card>
            <p className="text-sm text-musgo">
              {activeTab === "proximas" ? "Nenhuma pelada aberta no momento." : "Nenhuma pelada encerrada ainda."}
            </p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
