import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, MoreHorizontal, Star, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

function positionLabel(position: string) {
  const labels: Record<string, string> = {
    GOLEIRO: "Goleiro",
    DEFESA: "Zagueiro",
    MEIA: "Meia",
    ATAQUE: "Atacante"
  };
  return labels[position] || position;
}

function matchAverages(ratings: { value: number; match: { date: Date } }[]) {
  const grouped = new Map<number, number[]>();
  for (const rating of ratings) {
    const key = rating.match.date.getTime();
    grouped.set(key, [...(grouped.get(key) ?? []), rating.value]);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => right - left)
    .map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const isAdmin = isPeladaAdmin(user);
  const { id } = await params;
  const [player, activePlayers] = await Promise.all([
    prisma.player.findFirst({
      where: { id, peladaId: user.peladaId! },
      select: {
        id: true,
        nickname: true,
        photoUrl: true,
        position: true,
        membershipStatus: true,
        goals: { select: { quantity: true } },
        assists: { select: { quantity: true } },
        defenses: { select: { quantity: true } },
        attendances: { select: { status: true } },
        pollWinners: { select: { id: true } },
        ratings: { select: { value: true, match: { select: { date: true } } }, orderBy: { match: { date: "desc" } } }
      }
    }),
    prisma.player.findMany({
      where: { peladaId: user.peladaId!, active: true },
      select: {
        id: true,
        membershipStatus: true,
        ratings: { select: { value: true, match: { select: { date: true } } } }
      }
    })
  ]);

  if (!player) notFound();

  const isGuest = player.membershipStatus === "CONVIDADO";
  const goals = isGuest ? 0 : player.goals.reduce((sum, item) => sum + item.quantity, 0);
  const assists = isGuest ? 0 : player.assists.reduce((sum, item) => sum + item.quantity, 0);
  const saves = isGuest ? 0 : player.defenses.reduce((sum, item) => sum + item.quantity, 0);
  const presences = isGuest ? 0 : player.attendances.filter((attendance) => attendance.status === "CONFIRMED").length;
  const craque = isGuest ? 0 : player.pollWinners.length;
  const form = isGuest ? [] : matchAverages(player.ratings).slice(0, 5);
  const averageForm = average(form);
  const noteRanking = activePlayers
    .filter((item) => item.membershipStatus === "MENSALISTA")
    .map((item) => ({
      id: item.id,
      value: average(matchAverages(item.ratings).slice(0, 10)) ?? 0
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const noteRankPosition = noteRanking.findIndex((item) => item.id === player.id) + 1;

  return (
    <AppShell>
      <section className="-mx-5 -mt-5 overflow-hidden rounded-b-[28px] bg-gradient-to-br from-mata to-campo px-5 pb-7 pt-4 text-white">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/players" aria-label="Voltar">
            <ArrowLeft size={22} />
          </Link>
          {isAdmin ? (
            <Link href={`/players/${player.id}/edit`} aria-label="Editar jogador">
              <MoreHorizontal size={22} />
            </Link>
          ) : (
            <MoreHorizontal size={22} className="opacity-70" />
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <PlayerAvatar
            src={player.photoUrl}
            name={player.nickname}
            position={player.position}
            number={10}
            size="lg"
            className="bg-craque text-mata"
          />
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-.02em]">
            {player.nickname}
          </h1>
          <div className="mt-2 rounded-full bg-white/16 px-3 py-1 text-xs font-bold">
            <span className="text-craque">●</span> {positionLabel(player.position)}
            {player.membershipStatus === "MENSALISTA" ? " · Mensalista" : " · Convidado"}
          </div>
        </div>
      </section>

      <section className="stagger -mt-3 grid grid-cols-3 gap-2">
        <div className="animate-card rounded-[13px] bg-white p-3 text-center shadow-card">
          <div className="font-jersey text-3xl font-bold">{player.position === "GOLEIRO" ? saves : goals}</div>
          <p className="text-xs text-musgo">{player.position === "GOLEIRO" ? "Defesas" : "Gols"}</p>
        </div>
        <div className="animate-card rounded-[13px] bg-white p-3 text-center shadow-card">
          <div className="font-jersey text-3xl font-bold">{assists}</div>
          <p className="text-xs text-musgo">Assist.</p>
        </div>
        <div className="animate-card rounded-[13px] bg-white p-3 text-center shadow-card">
          <div className="font-jersey text-3xl font-bold">{presences}</div>
          <p className="text-xs text-musgo">Presencas</p>
        </div>
      </section>

      <section className="mt-3 rounded-card bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold">Forma - ultimas 5</h2>
          <div className="shrink-0 text-right">
            <span className="block text-xs font-bold text-campo">
              {averageForm ? `Media ${averageForm.toFixed(1)}` : "Sem notas"}
            </span>
            <span className="block text-[11px] font-semibold text-musgo">
              {noteRankPosition ? `${noteRankPosition}o no ranking de notas` : "Sem ranking"}
            </span>
          </div>
        </div>
        {form.length ? (
          <div className="stagger grid grid-cols-5 gap-2">
            {form.map((score, index) => (
              <div
                key={`${score}-${index}`}
                className={cn(
                  "grow-bar rounded-[8px] py-2 text-center font-jersey text-lg font-bold text-white",
                  score >= 8 ? "bg-campo" : score >= 6 ? "bg-[#55B979]" : "bg-craque text-mata"
                )}
              >
                {score.toFixed(1)}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-musgo">
            {isGuest
              ? "Convidados participam da pelada, mas os dados nao entram nas estatisticas da temporada."
              : "As notas aparecem aqui depois que os presentes avaliarem o jogador."}
          </p>
        )}
      </section>

      <section className="mt-4">
        <h2 className="mb-3 font-bold">Conquistas</h2>
        <div className="stagger grid grid-cols-3 gap-2">
          <div className="animate-card rounded-[13px] bg-[#FFF0D3] p-4 text-center text-mata">
            <Star className="mx-auto mb-2 text-craque" fill="currentColor" size={24} />
            <strong className="font-jersey text-2xl">{craque}x</strong>
            <p className="text-xs">Craque</p>
          </div>
          <div className="animate-card rounded-[13px] bg-[#EAF6EE] p-4 text-center text-mata">
            <Trophy className="mx-auto mb-2 text-campo" size={24} />
            <strong className="font-jersey text-2xl">{goals}</strong>
            <p className="text-xs">Artilheiro</p>
          </div>
          <div className="animate-card rounded-[13px] bg-[#EAF6EE] p-4 text-center text-mata">
            <Flame className="mx-auto mb-2 text-campo" size={24} />
            <strong className="font-jersey text-2xl">{presences}</strong>
            <p className="text-xs">Sequencia</p>
          </div>
        </div>
      </section>

      <Link
        href="/matches"
        className="mt-10 flex min-h-12 items-center justify-center rounded-[13px] bg-campo px-5 py-3 text-sm font-semibold text-white shadow-button"
      >
        Confirmar presenca na proxima
      </Link>
    </AppShell>
  );
}
