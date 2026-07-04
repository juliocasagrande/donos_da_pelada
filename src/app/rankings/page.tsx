import Link from "next/link";
import { Crown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { RankingFilterSelect, RankingPeladaSelect } from "@/components/rankings/RankingPeladaSelect";
import { Card } from "@/components/ui/Card";
import { closeExpiredCraquePolls } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "artilharia", label: "Gols", field: "goalsTotal" },
  { key: "assistencia", label: "Assist.", field: "assistsTotal" },
  { key: "presenca", label: "Pres.", field: "presenceTotal" },
  { key: "craque", label: "Craque", field: "craqueTotal" },
  { key: "notas", label: "Notas", field: "ratingAverage" }
] as const;

const kindTabs = [
  { key: "todos", label: "Ambos" },
  { key: "PELADA", label: "Peladinha" },
  { key: "AMISTOSO", label: "Amistoso" }
] as const;

type RankingTab = (typeof tabs)[number];
type RankingField = RankingTab["field"];
type RankingKind = (typeof kindTabs)[number]["key"];
type PeladaOption = { id: string; name: string };
type PlayerRow = {
  id: string;
  userId: string | null;
  nickname: string;
  photoUrl: string | null;
  position: string;
  rating: number;
  pelada: { name: string };
};
type RankedPlayer = PlayerRow & {
  pelada: { name: string };
  goalsTotal: number;
  assistsTotal: number;
  presenceTotal: number;
  craqueTotal: number;
  ratingAverage: number;
  previousRatingAverage: number;
  overall: number;
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatValue(value: number, field: RankingField) {
  return field === "ratingAverage" ? value.toFixed(1) : String(Math.round(value));
}


function currentSaoPauloYear() {
  return Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()));
}

function parseSeason(value: string | undefined): number | "total" {
  if (value === "total") return "total";
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : currentSaoPauloYear();
}

function seasonDateRange(season: number | "total") {
  if (season === "total") return {};
  return {
    gte: new Date(`${season}-01-01T00:00:00-03:00`),
    lt: new Date(`${season + 1}-01-01T00:00:00-03:00`)
  };
}

function matchFilter(kind: RankingKind, season: number | "total") {
  const dateRange = seasonDateRange(season);
  const match = {
    ...(kind === "todos" ? {} : { kind }),
    ...(Object.keys(dateRange).length ? { date: dateRange } : {})
  };
  return Object.keys(match).length ? { match } : {};
}


function sumRowsByPlayer(rows: { playerId: string; _sum: { quantity: number | null } }[]) {
  return new Map(rows.map((row) => [row.playerId, row._sum.quantity ?? 0]));
}

function countRowsByPlayer(rows: { playerId?: string; winnerId?: string | null; _count: number | { _all: number } }[]) {
  return new Map(
    rows
      .map((row) => [row.playerId ?? row.winnerId, typeof row._count === "number" ? row._count : row._count._all] as const)
      .filter((row): row is readonly [string, number] => Boolean(row[0]))
  );
}

function ratingAverages(rows: { playerId: string; value: number; match: { date: Date } }[]) {
  const groupedByPlayer = new Map<string, Map<number, number[]>>();
  for (const row of rows) {
    const playerRatings = groupedByPlayer.get(row.playerId) ?? new Map<number, number[]>();
    const key = row.match.date.getTime();
    playerRatings.set(key, [...(playerRatings.get(key) ?? []), row.value]);
    groupedByPlayer.set(row.playerId, playerRatings);
  }

  return new Map(
    [...groupedByPlayer.entries()].map(([playerId, matchRatings]) => {
      const averages = [...matchRatings.entries()]
        .sort(([left], [right]) => right - left)
        .map(([, values]) => average(values));
      return [
        playerId,
        {
          current: average(averages.slice(0, 10)),
          previous: average(averages.slice(1, 11))
        }
      ];
    })
  );
}

function groupPlayers(players: PlayerRow[], activeScope: string) {
  const groupsByKey = new Map<string, PlayerRow[]>();
  for (const player of players) {
    const key = activeScope === "todas" ? player.userId ?? `solo:${player.id}` : player.id;
    groupsByKey.set(key, [...(groupsByKey.get(key) ?? []), player]);
  }
  return [...groupsByKey.values()];
}

export default async function RankingsPage({
  searchParams
}: {
  searchParams?: Promise<{ tipo?: string; jogo?: string; pelada?: string; temporada?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const activeTab: RankingTab = tabs.find((tab) => tab.key === query?.tipo) ?? tabs[0];
  const activeKind = kindTabs.find((tab) => tab.key === query?.jogo) ?? kindTabs[0];
  const activeSeason = parseSeason(query?.temporada);
  const isAdmin = isPeladaAdmin(user);
  const memberPeladas: PeladaOption[] = user.shellMemberships.map((membership) => ({
    id: membership.pelada.id,
    name: membership.pelada.name
  }));
  const selectedPeladaExists = memberPeladas.some((pelada) => pelada.id === query?.pelada);
  const activeScope = query?.pelada === "todas" ? "todas" : selectedPeladaExists ? query!.pelada! : user.peladaId!;
  const selectedPeladaIds = activeScope === "todas" ? memberPeladas.map((pelada) => pelada.id) : [activeScope];
  const showPeladaName = activeScope === "todas";
  const selectedScopeLabel =
    activeScope === "todas"
      ? "Todas as minhas peladas"
      : memberPeladas.find((pelada) => pelada.id === activeScope)?.name || "Pelada ativa";

  const [matchYearRows, seasonStatYearRows] = await Promise.all([
    prisma.match.findMany({
      where: { peladaId: { in: selectedPeladaIds }, deletedAt: null, status: "CLOSED" },
      select: { date: true },
      orderBy: { date: "desc" }
    }),
    prisma.seasonPlayerStat.findMany({
      where: { peladaId: { in: selectedPeladaIds } },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" }
    })
  ]);
  const seasonYears = Array.from(
    new Set([currentSaoPauloYear(), ...matchYearRows.map((row) => row.date.getFullYear()), ...seasonStatYearRows.map((row) => row.year)])
  ).sort((a, b) => b - a);

  await Promise.all(selectedPeladaIds.map((peladaId) => closeExpiredCraquePolls(peladaId)));

  const players = await prisma.player.findMany({
    where: { peladaId: { in: selectedPeladaIds }, active: true, membershipStatus: "MENSALISTA" },
    select: {
      id: true,
      userId: true,
      nickname: true,
      photoUrl: true,
      position: true,
      rating: true,
      pelada: { select: { name: true } }
    }
  });
  const playerIds = players.map((player) => player.id);

  const [goalTotals, assistTotals, presenceTotals, craqueTotals, ratingRows, historicalStats] = playerIds.length
    ? await Promise.all([
        prisma.goal.groupBy({
          by: ["playerId"],
          where: { playerId: { in: playerIds }, ...matchFilter(activeKind.key, activeSeason) },
          _sum: { quantity: true }
        }),
        prisma.assist.groupBy({
          by: ["playerId"],
          where: { playerId: { in: playerIds }, ...matchFilter(activeKind.key, activeSeason) },
          _sum: { quantity: true }
        }),
        prisma.attendance.groupBy({
          by: ["playerId"],
          where: { playerId: { in: playerIds }, status: "CONFIRMED", ...matchFilter(activeKind.key, activeSeason) },
          _count: true
        }),
        prisma.poll.groupBy({
          by: ["winnerId"],
          where: { winnerId: { in: playerIds }, ...matchFilter(activeKind.key, activeSeason) },
          _count: { _all: true }
        }),
        activeTab.field === "ratingAverage"
          ? prisma.playerRating.findMany({
              where: { playerId: { in: playerIds }, ...matchFilter(activeKind.key, activeSeason) },
              select: { playerId: true, value: true, match: { select: { date: true } } },
              orderBy: { match: { date: "desc" } }
            })
          : Promise.resolve([]),
        activeKind.key === "todos"
          ? prisma.seasonPlayerStat.findMany({
              where: {
                playerId: { in: playerIds },
                ...(activeSeason === "total" ? {} : { year: activeSeason })
              }
            })
          : Promise.resolve([])
      ])
    : [[], [], [], [], [], []];

  const goalsByPlayerId = sumRowsByPlayer(goalTotals);
  const assistsByPlayerId = sumRowsByPlayer(assistTotals);
  const presenceByPlayerId = countRowsByPlayer(presenceTotals);
  const craqueByPlayerId = countRowsByPlayer(craqueTotals);
  const ratingsByPlayerId = ratingAverages(ratingRows);
  const historicalStatsByPlayerId = new Map<string, {
    goals: number;
    assists: number;
    presence: number;
    craque: number;
    ratingSum: number;
    ratingCount: number;
  }>();
  for (const stat of historicalStats) {
    const current = historicalStatsByPlayerId.get(stat.playerId) ?? {
      goals: 0,
      assists: 0,
      presence: 0,
      craque: 0,
      ratingSum: 0,
      ratingCount: 0
    };
    current.goals += stat.goals;
    current.assists += stat.assists;
    current.presence += stat.presence;
    current.craque += stat.craque;
    current.ratingSum += stat.ratingAverage * stat.ratingCount;
    current.ratingCount += stat.ratingCount;
    historicalStatsByPlayerId.set(stat.playerId, current);
  }


  const mapped: RankedPlayer[] = groupPlayers(players, activeScope).map((group) => {
    const primary = group[0];
    const peladaNames = [...new Set(group.map((player) => player.pelada.name))];
    const goalsTotal = group.reduce((sum, player) => sum + (goalsByPlayerId.get(player.id) ?? 0) + (historicalStatsByPlayerId.get(player.id)?.goals ?? 0), 0);
    const assistsTotal = group.reduce((sum, player) => sum + (assistsByPlayerId.get(player.id) ?? 0) + (historicalStatsByPlayerId.get(player.id)?.assists ?? 0), 0);
    const presenceTotal = group.reduce((sum, player) => sum + (presenceByPlayerId.get(player.id) ?? 0) + (historicalStatsByPlayerId.get(player.id)?.presence ?? 0), 0);
    const craqueTotal = group.reduce((sum, player) => sum + (craqueByPlayerId.get(player.id) ?? 0) + (historicalStatsByPlayerId.get(player.id)?.craque ?? 0), 0);
    const currentRatings = group
      .map((player) => ratingsByPlayerId.get(player.id)?.current)
      .filter((value): value is number => value !== undefined);
    const historicalRatings = group
      .map((player) => {
        const stat = historicalStatsByPlayerId.get(player.id);
        return stat && stat.ratingCount > 0 ? stat.ratingSum / stat.ratingCount : undefined;
      })
      .filter((value): value is number => value !== undefined);
    const previousRatings = group
      .map((player) => ratingsByPlayerId.get(player.id)?.previous)
      .filter((value): value is number => value !== undefined);
    const ratingAverage = average([...currentRatings, ...historicalRatings]);
    const previousRatingAverage = average(previousRatings);

    return {
      ...primary,
      id: primary.userId ?? primary.id,
      pelada: { name: peladaNames.length > 1 ? `${peladaNames.length} peladas` : peladaNames[0] },
      rating: average(group.map((player) => player.rating)),
      goalsTotal,
      assistsTotal,
      presenceTotal,
      craqueTotal,
      ratingAverage,
      previousRatingAverage,
      overall: goalsTotal * 3 + average(group.map((player) => player.rating))
    };
  });

  const ranked = [...mapped].sort((a, b) => b[activeTab.field] - a[activeTab.field] || b.overall - a.overall);
  const previousNoteRank = activeTab.field === "ratingAverage" ? [...mapped]
    .sort((a, b) => b.previousRatingAverage - a.previousRatingAverage || b.overall - a.overall)
    .reduce<Record<string, number>>((acc, player, index) => {
      acc[player.id] = index + 1;
      return acc;
    }, {}) : {};

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
      <div className="mb-3 pt-1">
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Rankings</h1>
      </div>

      <div className="mb-3 space-y-3">
        <RankingPeladaSelect options={memberPeladas} activeValue={activeScope} />
        <div className="grid grid-cols-2 gap-2">
          <RankingFilterSelect
            label="Temporada"
            paramName="temporada"
            activeValue={String(activeSeason)}
            options={[{ id: "total", name: "Todas" }, ...seasonYears.map((year) => ({ id: String(year), name: String(year) }))]}
          />
          <RankingFilterSelect
            label="Jogo"
            paramName="jogo"
            activeValue={activeKind.key}
            options={kindTabs.map((tab) => ({ id: tab.key, name: tab.label }))}
          />
        </div>
      </div>
      <p className="mb-3 text-xs font-semibold text-musgo">
        Mostrando participantes de {selectedScopeLabel}.
      </p>
      <div className="mb-6 grid grid-cols-5 gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/rankings?pelada=${activeScope}&tipo=${tab.key}&jogo=${activeKind.key}&temporada=${activeSeason}`}
            className={cn(
              "flex min-h-9 items-center justify-center rounded-[10px] px-0.5 text-center text-[10px] font-bold shadow-sm transition active:scale-[.98]",
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
            <PlayerAvatar src={second.photoUrl} name={second.nickname} position={second.position} number={7} className="mx-auto bg-campo" />
            <p className="mt-2 truncate text-sm font-bold">{second.nickname}</p>
            {showPeladaName ? <p className="truncate text-[11px] font-semibold text-musgo">{second.pelada.name}</p> : null}
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
            <PlayerAvatar src={first.photoUrl} name={first.nickname} position={first.position} number={10} size="lg" className="mx-auto bg-craque text-mata" />
            <p className="mt-2 truncate text-sm font-extrabold">{first.nickname}</p>
            {showPeladaName ? <p className="truncate text-[11px] font-semibold text-musgo">{first.pelada.name}</p> : null}
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
            <PlayerAvatar src={third.photoUrl} name={third.nickname} position={third.position} number={9} className="mx-auto bg-mata" />
            <p className="mt-2 truncate text-sm font-bold">{third.nickname}</p>
            {showPeladaName ? <p className="truncate text-[11px] font-semibold text-musgo">{third.pelada.name}</p> : null}
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
              <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} size="sm" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-extrabold">{player.nickname}</h2>
                {showPeladaName ? <p className="truncate text-xs font-semibold text-musgo">{player.pelada.name}</p> : null}
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

      {isAdmin ? (
        <Link
          href={`/rankings/temporadas?ano=${activeSeason === "total" ? currentSaoPauloYear() : activeSeason}`}
          className="mt-5 flex min-h-11 items-center justify-center rounded-[11px] bg-mata px-3 py-2.5 text-sm font-bold text-white shadow-card"
        >
          Editar estatisticas de temporadas
        </Link>
      ) : null}
    </AppShell>
  );
}
