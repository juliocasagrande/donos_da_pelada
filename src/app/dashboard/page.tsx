import Link from "next/link";
import { Bell, CalendarCheck, CalendarPlus, Clock, Shield, Star, Target, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { DeveloperCredit } from "@/components/layout/DeveloperCredit";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  const [linkedPlayer, players, lastMatch, nextMatch, goals, defenses, craque, monthMatches, pendingRatingPlayers] =
    await Promise.all([
      prisma.player.findUnique({ where: { userId: user.id } }),
      prisma.player.count({ where: { active: true, membershipStatus: "MENSALISTA" } }),
      prisma.match.findFirst({ orderBy: { date: "desc" } }),
      prisma.match.findFirst({
        where: { status: "OPEN" },
        include: { attendances: { where: { present: true }, take: 3 } },
        orderBy: { date: "asc" }
      }),
      prisma.goal.aggregate({ where: { player: { membershipStatus: "MENSALISTA" } }, _sum: { quantity: true } }),
      prisma.difficultSave.aggregate({ where: { player: { membershipStatus: "MENSALISTA" } }, _sum: { quantity: true } }),
      prisma.poll.findFirst({
        where: { status: "CLOSED", winnerId: { not: null }, winner: { membershipStatus: "MENSALISTA" } },
        include: { winner: true },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.match.count(),
      isAdmin
        ? prisma.player.findMany({ where: { active: true, ratingAssigned: false }, orderBy: { createdAt: "asc" } })
        : Promise.resolve([])
    ]);
  const isGuest = linkedPlayer?.membershipStatus === "CONVIDADO";

  const shortcuts = [
    { href: "/matches/new", label: "Nova pelada", icon: CalendarPlus },
    { href: "/matches", label: "Escalar times", icon: Target },
    { href: "/rankings", label: "Votar craque", icon: Star },
    ...(user.role === "MASTER" ? [{ href: "/admins", label: "Admins", icon: Shield }] : [])
  ];

  return (
    <AppShell>
      <section className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-musgo">Salve,</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">{user.name?.split(" ")[0] || "Craque"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative flex h-11 w-11 items-center justify-center rounded-[12px] bg-white shadow-card">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-ausente" />
          </button>
          <Link
            href="/perfil"
            className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-mata font-jersey text-xl font-bold text-white"
            title="Meu perfil"
          >
            {(user.name || "P").charAt(0).toUpperCase()}
          </Link>
        </div>
      </section>

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

      <div className="stagger mt-4 grid grid-cols-3 gap-2">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="animate-card flex min-h-[70px] flex-col items-center justify-center gap-1.5 px-2 text-center transition hover:-translate-y-0.5 active:scale-95">
              <item.icon className="text-campo" size={21} />
              <span className="text-xs font-bold leading-tight">{item.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <DeveloperCredit className="mt-6" />
    </AppShell>
  );
}
