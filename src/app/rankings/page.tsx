import Link from "next/link";
import { Crown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { RankingPeladaSelect } from "@/components/rankings/RankingPeladaSelect";
import { Card } from "@/components/ui/Card";
import { closeExpiredCraquePolls } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "artilharia", label: "Gols", field: "goalsTotal" },
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
type RankingKind = (typeof kindTabs)[number]["key"];

function score(player: { rating: number; goals: { quantity: number }[] }) {
  const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
  return goals * 3 + player.rating;
}

function matchesKind<T extends { match: { kind: string } }>(items: T[], kind: RankingKind) {
  return kind === "todos" ? items : items.filter((item) => item.match.kind === kind);
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

function emptyFriendlySummary(peladaId: string, peladaName: string) {
  return {
    peladaId,
    peladaName,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0
  };
}

export default async function RankingsPage({
  searchParams
}: {
  searchParams?: Promise<{ tipo?: string; jogo?: string; pelada?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const activeTab: RankingTab = tabs.find((tab) => tab.key === query?.tipo) ?? tabs[0];
  const activeKind = kindTabs.find((tab) => tab.key === query?.jogo) ?? kindTabs[0];
  const memberships = await prisma.peladaMembership.findMany({
    where: { userId: user.id },
    include: { pelada: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" }
  });
  const memberPeladas = memberships.map((membership) => membership.pelada);
  const selectedPeladaExists = memberPeladas.some((pelada) => pelada.id === query?.pelada);
  const activeScope = query?.pelada === "todas" ? "todas" : selectedPeladaExists ? query!.pelada! : user.peladaId!;
  const selectedPeladaIds = activeScope === "todas" ? memberPeladas.map((pelada) => pelada.id) : [activeScope];
  const showPeladaName = activeScope === "todas";
  const selectedScopeLabel =
    activeScope === "todas"
      ? "Todas as minhas peladas"
      : memberPeladas.find((pelada) => pelada.id === activeScope)?.name || "Pelada ativa";

  await Promise.all(selectedPeladaIds.map((peladaId) => closeExpiredCraquePolls(peladaId)));

  const players = await prisma.player.findMany({
    where: { peladaId: { in: selectedPeladaIds }, active: true, membershipStatus: "MENSALISTA" },
    include: {
      pelada: { select: { name: true } },
      goals: { include: { match: { select: { kind: true } } } },
      defenses: { include: { match: { select: { kind: true } } } },
      pollWinners: { include: { match: { select: { kind: true } } } },
      attendances: { include: { match: { select: { kind: true } } } },
      ratings: { include: { match: true } }
    }
  });
  const friendlyMatches = await prisma.match.findMany({
    where: {
      peladaId: { in: selectedPeladaIds },
      kind: "AMISTOSO",
      status: "CLOSED",
      homeScore: { not: null },
      awayScore: { not: null }
    },
    include: { pelada: { select: { id: true, name: true } } }
  });
  const friendlySummaryMap = new Map(
    memberPeladas
      .filter((pelada) => selectedPeladaIds.includes(pelada.id))
      .map((pelada) => [pelada.id, emptyFriendlySummary(pelada.id, pelada.name)])
  );
  for (const match of friendlyMatches) {
    const summary = friendlySummaryMap.get(match.peladaId) ?? emptyFriendlySummary(match.peladaId, match.pelada.name);
    summary.matches += 1;
    summary.goalsFor += match.homeScore ?? 0;
    summary.goalsAgainst += match.awayScore ?? 0;
    if ((match.homeScore ?? 0) > (match.awayScore ?? 0)) summary.wins += 1;
    else if ((match.homeScore ?? 0) < (match.awayScore ?? 0)) summary.losses += 1;
    else summary.draws += 1;
    friendlySummaryMap.set(match.peladaId, summary);
  }
  const friendlySummaries = [...friendlySummaryMap.values()].filter((summary) => summary.matches > 0);

  const mapped = players.map((player) => {
    const goals = matchesKind(player.goals, activeKind.key);
    const defenses = matchesKind(player.defenses, activeKind.key);
    const pollWinners = matchesKind(player.pollWinners, activeKind.key);
    const attendances = matchesKind(player.attendances, activeKind.key);
    const ratings = matchesKind(player.ratings, activeKind.key);
    const averages = matchAverages(ratings);
    return {
      ...player,
      goalsTotal: goals.reduce((sum, item) => sum + item.quantity, 0),
      defensesTotal: defenses.reduce((sum, item) => sum + item.quantity, 0),
      presenceTotal: attendances.filter((attendance) => attendance.status === "CONFIRMED").length,
      craqueTotal: pollWinners.length,
      ratingAverage: average(averages.slice(0, 10)),
      previousRatingAverage: average(averages.slice(1, 11)),
      overall: score({ ...player, goals })
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

      <RankingPeladaSelect
        options={memberPeladas}
        activeValue={activeScope}
      />
      <p className="mb-3 text-xs font-semibold text-musgo">
        Mostrando participantes de {selectedScopeLabel}.
      </p>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {kindTabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/rankings?pelada=${activeScope}&tipo=${activeTab.key}&jogo=${tab.key}`}
            className={cn(
              "flex min-h-9 items-center justify-center rounded-[10px] px-1 text-center text-[11px] font-bold shadow-sm transition active:scale-[.98]",
              activeKind.key === tab.key ? "bg-mata text-white" : "bg-white text-musgo"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/rankings?pelada=${activeScope}&tipo=${tab.key}&jogo=${activeKind.key}`}
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

      {friendlySummaries.length > 0 && (activeKind.key === "todos" || activeKind.key === "AMISTOSO") ? (
        <section className="mb-5">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="font-jersey text-xs font-semibold uppercase tracking-[.12em] text-musgo">Amistosos</p>
              <h2 className="font-display text-xl font-extrabold tracking-[-.02em]">Resumo por pelada</h2>
            </div>
          </div>
          <div className="space-y-2">
            {friendlySummaries.map((summary) => (
              <Card key={summary.peladaId} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold">{summary.peladaName}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-musgo">
                      {summary.matches} jogos - {summary.wins}V/{summary.draws}E/{summary.losses}D
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[10px] bg-areia px-3 py-2 text-right">
                    <p className="font-jersey text-lg font-bold text-tinta">
                      {summary.goalsFor} x {summary.goalsAgainst}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-musgo">gols</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
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
    </AppShell>
  );
}
