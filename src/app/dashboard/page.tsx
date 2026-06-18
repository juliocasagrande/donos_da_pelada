import Link from "next/link";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  Clock,
  Shield,
  Star,
  Target,
  Ticket,
  Trophy,
  Trash2,
  UserCheck,
  Users
} from "lucide-react";
import { DeletionVoteValue } from "@prisma/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { DeveloperCredit } from "@/components/layout/DeveloperCredit";
import { closeExpiredCraquePolls } from "@/lib/actions";
import { voteDeletionRequest } from "@/lib/deletionVotingActions";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  await closeExpiredCraquePolls(user.peladaId!);
  const isAdmin = isPeladaAdmin(user);
  const peladaId = user.peladaId!;
  const [
    linkedPlayer,
    players,
    lastMatch,
    nextMatch,
    goals,
    defenses,
    craque,
    monthMatches,
    pendingRatingPlayers,
    pendingJoinRequestsCount,
    openCraquePoll,
    pendingDeletionRequests,
    peladaAdminCount
  ] = await Promise.all([
    prisma.player.findFirst({ where: { userId: user.id, peladaId } }),
    prisma.player.count({ where: { peladaId, active: true, membershipStatus: "MENSALISTA" } }),
    prisma.match.findFirst({ where: { peladaId }, orderBy: { date: "desc" } }),
    prisma.match.findFirst({
      where: { peladaId, status: "OPEN" },
      include: { attendances: { where: { present: true }, take: 3 } },
      orderBy: { date: "asc" }
    }),
    prisma.goal.aggregate({
      where: { player: { peladaId, membershipStatus: "MENSALISTA" } },
      _sum: { quantity: true }
    }),
    prisma.difficultSave.aggregate({
      where: { player: { peladaId, membershipStatus: "MENSALISTA" } },
      _sum: { quantity: true }
    }),
    prisma.poll.findFirst({
      where: { match: { peladaId }, status: "CLOSED", winnerId: { not: null }, winner: { membershipStatus: "MENSALISTA" } },
      include: { winner: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.match.count({ where: { peladaId } }),
    isAdmin
      ? prisma.player.findMany({ where: { peladaId, active: true, ratingAssigned: false }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.peladaJoinRequest.count({ where: { peladaId, status: "PENDING" } })
      : Promise.resolve(0),
    prisma.poll.findFirst({
      where: { status: "OPEN", title: "Craque da pelada", match: { peladaId } },
      select: { matchId: true },
      orderBy: { createdAt: "desc" }
    }),
    isAdmin
      ? prisma.deletionRequest.findMany({
          where: { peladaId, status: "OPEN" },
          include: {
            createdByUser: { select: { name: true, email: true } },
            votes: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } }
          },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.peladaMembership.count({
          where: { peladaId, role: { in: ["PRESIDENTE", "ADMIN"] }, user: { active: true } }
        })
      : Promise.resolve(0)
  ]);
  const isGuest = linkedPlayer?.membershipStatus === "CONVIDADO";
  const displayName = linkedPlayer?.nickname || linkedPlayer?.name || user.name?.split(" ")[0] || "Craque";

  const gameShortcuts = [
    { href: "/matches/new", label: "Nova pelada", icon: CalendarPlus },
    { href: "/matches", label: "Escalar times", icon: Target },
    { href: openCraquePoll ? `/matches/${openCraquePoll.matchId}/stats` : "/matches?aba=anteriores", label: "Votar craque", icon: Star }
  ];

  const managementItems = [
    {
      href: "/admins/solicitacoes",
      label: "Solicitações de entrada",
      icon: UserCheck,
      badge: pendingJoinRequestsCount > 0 ? pendingJoinRequestsCount : null,
      tint: "bg-[#FCEFD6] text-[#C58207]"
    },
    { href: "/admins/convites", label: "Convites", icon: Ticket, badge: null, tint: "bg-[#EAF5EC] text-campo" },
    ...(user.role === "MASTER"
      ? [{ href: "/admins", label: "Admins & permissões", icon: Shield, badge: null, tint: "bg-[#EAF5EC] text-campo" }]
      : [])
  ];

  return (
    <AppShell>
      <div className="mb-4 flex items-baseline gap-2 leading-tight">
        <span className="font-jersey text-[13px] font-semibold uppercase tracking-[.12em] text-musgo">Salve,</span>
        <span className="font-display text-[24px] font-extrabold tracking-[-.02em] text-campo">
          {displayName} <span className="text-lg">👋</span>
        </span>
      </div>

      {isAdmin && pendingRatingPlayers.length ? (
        <Card className="animate-card mb-4 border border-craque/40 bg-[#FFF7E6]">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#8a5a06]">
            <Star size={14} fill="#F4A11A" /> Nota pendente
          </p>
          <h2 className="mt-1 font-display text-lg font-extrabold">
            {pendingRatingPlayers.length === 1
              ? "1 jogador novo aguardando nota"
              : `${pendingRatingPlayers.length} jogadores novos aguardando nota`}
          </h2>
          <p className="mt-1 truncate text-sm text-musgo">
            {pendingRatingPlayers.map((player) => player.nickname || player.name).join(", ")}
          </p>
          <Link
            href="/players"
            className="mt-3 inline-flex rounded-[11px] bg-craque px-4 py-2 text-sm font-bold text-tinta"
          >
            Atribuir notas
          </Link>
        </Card>
      ) : null}

      {isAdmin && pendingDeletionRequests.length ? (
        <Card className="animate-card mb-4 border border-ausente/25 bg-[#FBE9E6]">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-ausente">
            <Trash2 size={14} /> Votacoes pendentes
          </p>
          <div className="mt-3 space-y-3">
            {pendingDeletionRequests.map((request) => {
              const currentVote = request.votes.find((vote) => vote.userId === user.id);
              const yesVotes = request.votes.filter((vote) => vote.vote === "YES").length;
              const noVotes = request.votes.filter((vote) => vote.vote === "NO").length;
              const creator = request.createdByUser?.name || request.createdByUser?.email || "Admin";
              const event = request.target === "PELADA" ? "Excluir pelada" : "Remover jogador";

              return (
                <div key={request.id} className="rounded-[13px] bg-white/75 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-musgo">Criado por {creator}</p>
                      <h2 className="mt-0.5 font-display text-base font-extrabold">{event}</h2>
                      <p className="truncate text-sm text-tinta">{request.targetName}</p>
                      <p className="mt-1 text-xs text-musgo">
                        SIM {yesVotes}/{peladaAdminCount} · NAO {noVotes}/{peladaAdminCount}
                      </p>
                    </div>
                    {currentVote ? (
                      <span className="rounded-[8px] bg-areia px-2 py-1 text-[11px] font-bold text-mata">
                        Voce votou {currentVote.vote === "YES" ? "SIM" : "NAO"}
                      </span>
                    ) : null}
                  </div>
                  {!currentVote ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <form action={voteDeletionRequest.bind(null, request.id, DeletionVoteValue.YES)}>
                        <Button type="submit" className="w-full py-2 text-xs">SIM</Button>
                      </form>
                      <form action={voteDeletionRequest.bind(null, request.id, DeletionVoteValue.NO)}>
                        <Button type="submit" variant="secondary" className="w-full py-2 text-xs">NAO</Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {craque?.winner ? (
        <Card className="shine-sweep animate-card mb-4 border border-craque/30 bg-[#FCEFD6]">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#8a5a06]"><Star size={14} fill="#F4A11A" /> Craque atual</p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold">{craque.winner.nickname || craque.winner.name}</h2>
              <p className="text-sm text-musgo">{craque.title}</p>
            </div>
            <Trophy className="text-craque" size={36} />
          </div>
        </Card>
      ) : null}

      {nextMatch ? (
        <Card className="field-hero mb-4 rounded-[22px] p-5 text-white">
          <div className="relative">
            <p className="flex items-center gap-2 font-jersey text-sm font-semibold uppercase tracking-[.12em] text-green-200">
              <span className="pulse-dot h-2 w-2 rounded-full bg-craque" /> Proxima pelada
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">{nextMatch.title}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-green-100">
              <span className="flex items-center gap-1.5"><Clock size={15} /> {formatDate(nextMatch.date)} as {formatTime(nextMatch.date)}</span>
              <LocationLinks location={nextMatch.location} />
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/matches/${nextMatch.id}/attendance`} className="flex-1">
                <Button className="w-full bg-craque text-tinta shadow-none">
                  {isGuest ? "Aguardar convite" : "Vou jogar"}
                </Button>
              </Link>
              <Button variant="ghost" className="border-white/25 bg-transparent text-white">Nao vou</Button>
            </div>
            <p className="mt-3 text-xs text-green-200">{nextMatch.attendances.length} confirmados</p>
          </div>
        </Card>
      ) : null}

      <div className="stagger grid grid-cols-2 gap-3">
        <StatTile icon={Users} value={players} label="Jogadores" />
        <StatTile icon={Target} value={goals._sum.quantity || 0} label="Gols na temporada" accent="yellow" />
        <StatTile icon={CalendarCheck} value={monthMatches} label="Peladas no mes" />
        <StatTile icon={Star} value={craque ? 1 : 0} label="Vezes craque" accent="yellow" />
      </div>

      <p className="mt-4 text-sm text-musgo">
        Ultima pelada: {lastMatch ? `${lastMatch.title} em ${formatDate(lastMatch.date)}` : "nenhuma pelada criada ainda"} · {defenses._sum.quantity || 0} defesas
      </p>

      <SectionLabel className="mb-2 mt-5">Atalhos de jogo</SectionLabel>
      <div className="stagger grid grid-cols-3 gap-2">
        {gameShortcuts.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="animate-card flex min-h-[70px] flex-col items-center justify-center gap-1.5 px-2 text-center transition hover:-translate-y-0.5 active:scale-95">
              <item.icon className="text-campo" size={21} />
              <span className="text-xs font-bold leading-tight">{item.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      {isAdmin && managementItems.length ? (
        <>
          <div className="mb-2 mt-5 flex items-center gap-2">
            <SectionLabel>Gestão da pelada</SectionLabel>
            <span className="rounded-[5px] bg-[#FCEFD6] px-1.5 py-0.5 text-[10px] font-bold text-[#8a5a06]">ADMIN</span>
          </div>
          <Card className="divide-y divide-linha p-0">
            {managementItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3.5">
                <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${item.tint}`}>
                  <item.icon size={17} />
                </div>
                <span className="flex-1 font-semibold">{item.label}</span>
                {item.badge ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ausente px-1.5 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
                <ChevronRight size={16} className="text-[#C7CDC0]" />
              </Link>
            ))}
          </Card>
        </>
      ) : null}

      <DeveloperCredit className="mt-6" />
    </AppShell>
  );
}
