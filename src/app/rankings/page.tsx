import Link from "next/link";
import { Crown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "artilharia", label: "Gols", field: "goalsTotal" },
  { key: "presenca", label: "Pres.", field: "presenceTotal" },
  { key: "craque", label: "Craque", field: "craqueTotal" },
  { key: "notas", label: "Notas", field: "ratingAverage" }
] as const;

type RankingTab = (typeof tabs)[number];

function score(player: { rating: number; goals: { quantity: number }[] }) {
  const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
  return goals * 3 + player.rating;
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
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatValue(value: number, field: RankingTab["field"]) {
  return field === "ratingAverage" ? value.toFixed(1) : String(Math.round(value));
}

export default async function RankingsPage({
  searchParams
}: {
  searchParams?: Promise<{ tipo?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const activeTab: RankingTab = tabs.find((tab) => tab.key === query?.tipo) ?? tabs[0];

  const players = await prisma.player.findMany({
    where: { active: true, membershipStatus: "MENSALISTA" },
    include: {
      goals: true,
      defenses: true,
      pollWinners: true,
      attendances: true,
      ratings: { include: { match: true } }
    }
  });

  const mapped = players.map((player) => {
    const averages = matchAverages(player.ratings);
    return {
      ...player,
      goalsTotal: player.goals.reduce((sum, item) => sum + item.quantity, 0),
      defensesTotal: player.defenses.reduce((sum, item) => sum + item.quantity, 0),
      presenceTotal: player.attendances.filter((attendance) => attendance.status === "CONFIRMED").length,
      craqueTotal: player.pollWinners.length,
      ratingAverage: average(averages.slice(0, 10)),
      previousRatingAverage: average(averages.slice(1, 11)),
      overall: score(player)
    };
  });

  const ranked = [...mapped].sort((a, b) => b[activeTab.field] - a[activeTab.field] || b.overall - a.overall);
  const previousNoteRank = [...mapped]
    .sort((a, b) => b.previousRatingAverage - a.previousRatingAverage || b.overall - a.overall)
    .reduce<Record<string, number>>((acc, player, index) => {
      acc[player.id] = index + 1;
      return acc;
    }, {});

  const [second, first, third] = [ranked[1], ranked[0], ranked[2]];
  const list = ranked.slice(3, 10);

  function TrendIcon({ playerId, index }: { playerId: string; index: number }) {
    if (activeTab.field !== "ratingAverage") {
      return <Minus size={14} className="text-[#A7AFA1]" />;
    }

    const currentPosition = index + 1;
    const previousPosition = previousNoteRank[playerId] ?? currentPosition;
    if (currentPosition < previousPosition) return <TrendingUp size={14} className="trend-bounce text-campo" />;
    if (currentPosition > previousPosition) return <TrendingDown size={14} className="trend-bounce text-ausente" />;
    return <Minus size={14} className="text-[#A7AFA1]" />;
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between gap-3 pt-1">
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Rankings</h1>
        <span className="shrink-0 rounded-[13px] bg-white px-3 py-2 text-sm font-semibold shadow-card">Temporada 2026</span>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/rankings?tipo=${tab.key}`}
            className={cn(
              "flex min-h-9 items-center justify-center rounded-[10px] px-1 text-center text-[11px] font-bold shadow-sm transition active:scale-[.98]",
              activeTab.key === tab.key ? "bg-campo text-white" : "bg-white text-musgo"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab.field === "ratingAverage" ? (
        <p className="mb-4 text-sm text-musgo">Media das notas recebidas nas ultimas 10 peladas avaliadas.</p>
      ) : null}

      <section className="mb-5 grid grid-cols-3 items-end gap-2">
        {second ? (
          <div className="rise-podium text-center" style={{ animationDelay: "90ms" }}>
            <PlayerAvatar src={second.photoUrl} name={second.name} position={second.position} number={7} className="mx-auto bg-campo" />
            <p className="mt-2 truncate text-sm font-bold">{second.nickname || second.name}</p>
            <Card className="mt-2 rounded-b-none p-3">
              <div className="font-jersey text-2xl font-bold text-campo">{formatValue(second[activeTab.field], activeTab.field)}</div>
              <div className="font-jersey text-2xl font-bold text-[#A7AFA1]">2o</div>
            </Card>
          </div>
        ) : (
          <div />
        )}

        {first ? (
          <div className="rise-podium text-center" style={{ animationDelay: "260ms" }}>
            <Crown className="mx-auto mb-1 text-craque" size={18} fill="currentColor" />
            <PlayerAvatar src={first.photoUrl} name={first.name} position={first.position} number={10} size="lg" className="mx-auto bg-craque text-mata" />
            <p className="mt-2 truncate text-sm font-extrabold">{first.nickname || first.name}</p>
            <Card className="mt-2 rounded-b-none p-3">
              <div className="font-jersey text-3xl font-bold text-craque">{formatValue(first[activeTab.field], activeTab.field)}</div>
              <div className="font-jersey text-3xl font-bold text-craque">1o</div>
            </Card>
          </div>
        ) : (
          <div />
        )}

        {third ? (
          <div className="rise-podium text-center" style={{ animationDelay: "0ms" }}>
            <PlayerAvatar src={third.photoUrl} name={third.name} position={third.position} number={9} className="mx-auto bg-mata" />
            <p className="mt-2 truncate text-sm font-bold">{third.nickname || third.name}</p>
            <Card className="mt-2 rounded-b-none p-3">
              <div className="font-jersey text-2xl font-bold text-campo">{formatValue(third[activeTab.field], activeTab.field)}</div>
              <div className="font-jersey text-2xl font-bold text-[#A7AFA1]">3o</div>
            </Card>
          </div>
        ) : (
          <div />
        )}
      </section>

      <div className="stagger space-y-2.5">
        {list.map((player, index) => (
          <Card key={player.id} className="animate-card p-3">
            <div className="flex items-center gap-3">
              <span className="w-7 text-center font-jersey text-xl font-bold text-[#A7AFA1]">{index + 4}</span>
              <PlayerAvatar src={player.photoUrl} name={player.name} position={player.position} size="sm" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-extrabold">{player.nickname || player.name}</h2>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold">
                <TrendIcon playerId={player.id} index={index + 3} />
                <span>{formatValue(player[activeTab.field], activeTab.field)}</span>
              </div>
            </div>
          </Card>
        ))}
        {!ranked.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhum jogador ativo para montar o ranking.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
