import { Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CraqueVotingWizard } from "@/components/matches/CraqueVotingWizard";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Card } from "@/components/ui/Card";
import { RatePlayerForm } from "@/components/matches/RatePlayerForm";
import { ShareMatchStoryButton } from "@/components/matches/ShareMatchStoryButton";
import { closeExpiredCraquePolls } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { VOTING_WINDOW_HOURS } from "@/lib/attendance";

function pollExpiresAt(createdAt: Date) {
  return createdAt.getTime() + VOTING_WINDOW_HOURS * 60 * 60 * 1000;
}

function isVotingOpen(createdAt?: Date, status?: string) {
  if (!createdAt || status !== "OPEN") return false;
  return Date.now() <= pollExpiresAt(createdAt);
}

function votingEndsAt(createdAt?: Date) {
  if (!createdAt) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(pollExpiresAt(createdAt)));
}

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await closeExpiredCraquePolls(user.peladaId!);
  const { id } = await params;
  const [match, players, poll, linkedPlayer] = await Promise.all([
    prisma.match.findFirst({ where: { id, peladaId: user.peladaId!, deletedAt: null } }),
    prisma.player.findMany({
      where: {
        peladaId: user.peladaId!,
        active: true,
        attendances: { some: { matchId: id, status: "CONFIRMED" } }
      },
      include: {
        goals: { where: { matchId: id } },
        assists: { where: { matchId: id } },
        defenses: { where: { matchId: id } },
        ratings: { where: { matchId: id }, select: { userId: true, playerId: true, value: true } },
        matchSubmissions: { where: { matchId: id } }
      },
      orderBy: { nickname: "asc" }
    }),
    prisma.poll.findFirst({
      where: { matchId: id, title: "Craque da pelada" },
      orderBy: { createdAt: "desc" },
      include: { votes: { select: { userId: true, playerId: true } }, winner: true }
    }),
    prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } })
  ]);

  const isAdmin = isPeladaAdmin(user);
  const viewerAttendance = linkedPlayer
    ? await prisma.attendance.findUnique({ where: { matchId_playerId: { matchId: id, playerId: linkedPlayer.id } } })
    : null;
  const canVote =
    viewerAttendance?.status === "CONFIRMED" &&
    linkedPlayer?.active === true;
  const votingOpen = isVotingOpen(poll?.createdAt, poll?.status);
  const ownPlayer = linkedPlayer ? players.find((player) => player.id === linkedPlayer.id) : null;

  const voteCounts = new Map<string, number>();
  for (const vote of poll?.votes ?? []) {
    voteCounts.set(vote.playerId, (voteCounts.get(vote.playerId) ?? 0) + 1);
  }

  const totalVotes = poll?.votes.length ?? 0;
  const candidates = players
    .map((player) => {
      const votes = voteCounts.get(player.id) ?? 0;
      const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
      const assists = player.assists.reduce((sum, item) => sum + item.quantity, 0);
      const defenses = player.defenses.reduce((sum, item) => sum + item.quantity, 0);
      const viewerRating = player.ratings.find((rating) => rating.userId === user.id)?.value;
      const averageRating = player.ratings.length
        ? player.ratings.reduce((sum, rating) => sum + rating.value, 0) / player.ratings.length
        : null;
      return {
        ...player,
        votes,
        totalGoals: goals,
        percent: totalVotes ? Math.round((votes / totalVotes) * 100) : 0,
        averageRating,
        viewerRating,
        summary:
          player.position === "GOLEIRO" ? `${defenses} defesas dificeis` : `${goals} gols · ${assists} assist.`
      };
    })
    .sort((a, b) => b.votes - a.votes || (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.rating - a.rating);
  const leader = candidates[0];
  // Show the current top 3 even while numbers/votes are still trickling in
  // (mostly zeros early on) - partial standings are still useful mid-window.
  const scorersRanked = [...candidates].sort((a, b) => b.totalGoals - a.totalGoals);
  const topScorers = scorersRanked.slice(0, 3);
  const topVoted = candidates.slice(0, 3);
  const ownCandidate = linkedPlayer ? candidates.find((player) => player.id === linkedPlayer.id) ?? null : null;
  const ownScorerIndex = linkedPlayer ? scorersRanked.findIndex((player) => player.id === linkedPlayer.id) : -1;
  const ownVoteIndex = linkedPlayer ? candidates.findIndex((player) => player.id === linkedPlayer.id) : -1;
  const ownScorerRank =
    ownScorerIndex >= 3 ? { rank: ownScorerIndex + 1, label: `${scorersRanked[ownScorerIndex].totalGoals} gols` } : null;
  const ownVoteRank =
    ownVoteIndex >= 3 ? { rank: ownVoteIndex + 1, label: `${candidates[ownVoteIndex].votes} votos` } : null;
  const ownIsCraque = Boolean(poll?.status === "CLOSED" && ownCandidate && poll.winnerId === ownCandidate.id);
  const eligiblePlayers = players.filter((player) => player.userId && player.active);
  const eligibleUserIds = [...new Set(eligiblePlayers.map((player) => player.userId!).filter(Boolean))];
  const ownConfirmed = Boolean(ownPlayer?.matchSubmissions.some((submission) => submission.userId === user.id));
  const ownStatsSent = Boolean(ownPlayer?.goals.length || ownPlayer?.defenses.length);
  const ownCraqueVote = poll?.votes.find((vote) => vote.userId === user.id);
  // Anyone who played this match gets the wizard card (steps while voting is
  // open, final results once it closes); everyone else just sees the public list.
  const isParticipant = Boolean(canVote && ownPlayer);
  const showStandaloneRatings = isAdmin && (!isParticipant || !votingOpen);
  const completedUserIds = new Set(
    eligiblePlayers
      .filter((player) => {
        const userId = player.userId!;
        const submitted = players.some((candidate) =>
          candidate.matchSubmissions.some((submission) => submission.userId === userId)
        );
        const voted = Boolean(poll?.votes.some((vote) => vote.userId === userId));
        return submitted && voted;
      })
      .map((player) => player.userId!)
  );
  const pendingResponses = Math.max(0, eligibleUserIds.length - completedUserIds.size);
  const votingMsLeft = poll?.createdAt ? Math.max(0, pollExpiresAt(poll.createdAt) - Date.now()) : 0;
  const votingMinutesLeft = Math.ceil(votingMsLeft / 60000);

  return (
    <AppShell>
      <section className="-mx-5 -mt-5 bg-gradient-to-br from-tinta to-mata px-5 pb-7 pt-5 text-white">
        <p className="mb-2 inline-flex items-center gap-2 rounded-[8px] bg-craque/20 px-3 py-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-craque">
          <span className="h-1.5 w-1.5 rounded-full bg-craque" /> {votingOpen ? "Votacao aberta" : "Votacao encerrada"}
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">
          {match?.kind === "AMISTOSO" ? "Craque do amistoso" : "Craque da pelada"}
        </h1>
        {match?.kind === "AMISTOSO" ? (
          <p className="mt-1 text-sm font-bold text-green-100">
            {match.title} x {match.opponentName || "Adversario"}
            {match.homeScore != null && match.awayScore != null ? ` - ${match.homeScore} a ${match.awayScore}` : ""}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-green-100">
          {votingOpen
            ? `Aberta ate ${votingEndsAt(poll?.createdAt)} para craque.`
            : match?.status === "CLOSED"
              ? "A janela de 1h30 terminou ou todos responderam."
              : "A votacao abre automaticamente quando o admin fechar a pelada."}
        </p>
      </section>

      <section className="-mt-5 mb-5 space-y-2.5">
        {ownCandidate ? (
          <Card
            className={cn(
              "border-2 p-4",
              ownIsCraque ? "border-craque/50 bg-gradient-to-br from-[#fff4d8] to-[#eaf5ec]" : "border-campo/20 bg-[#EAF5EC]"
            )}
          >
            <div className="flex items-center gap-3">
              <PlayerAvatar src={ownCandidate.photoUrl} name={ownCandidate.nickname} position={ownCandidate.position} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase text-musgo">Seu resumo dessa pelada</p>
                <h2 className="truncate font-display text-xl font-extrabold">{ownCandidate.nickname}</h2>
                <p className="mt-0.5 text-sm font-semibold text-musgo">
                  {ownCandidate.summary} · nota {ownCandidate.averageRating?.toFixed(1) ?? "-"}
                </p>
                {ownIsCraque ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-[7px] bg-craque px-2 py-1 text-[10px] font-black uppercase text-mata">
                    <Star size={11} fill="currentColor" /> Craque da pelada
                  </span>
                ) : null}
              </div>
            </div>
            <ShareMatchStoryButton
              matchId={id}
              playerId={ownCandidate.id}
              fileLabel={ownCandidate.nickname}
              label="Compartilhar no story"
              className="mt-3 w-full py-2.5 text-sm"
            />
          </Card>
        ) : null}

        {poll && canVote && votingOpen && (ownCraqueVote || ownConfirmed || ownStatsSent) ? (
          <Card className="border border-campo/20 bg-[#EAF5EC]">
            <p className="text-sm font-bold text-mata">
              {pendingResponses === 0
                ? "Todos responderam. O resultado sera publicado agora."
                : `${pendingResponses} ${pendingResponses === 1 ? "pessoa falta" : "pessoas faltam"} responder.`}
            </p>
            <p className="mt-1 text-xs text-musgo">
              Tempo restante: {votingMinutesLeft <= 1 ? "menos de 1 minuto" : `${votingMinutesLeft} minutos`}.
            </p>
          </Card>
        ) : null}

        {isParticipant && poll ? (
          <CraqueVotingWizard
            matchId={id}
            pollId={poll.id}
            votingOpen={votingOpen}
            ownStats={{
              goals: ownPlayer!.goals[0]?.quantity || 0,
              assists: ownPlayer!.assists[0]?.quantity || 0,
              defenses: ownPlayer!.defenses[0]?.quantity || 0
            }}
            initialStatsSent={ownStatsSent}
            initialVotedPlayerId={ownCraqueVote?.playerId ?? null}
            isAdmin={isAdmin}
            candidates={candidates
              .filter((player) => player.id !== linkedPlayer?.id)
              .map((player) => ({
                id: player.id,
                nickname: player.nickname,
                photoUrl: player.photoUrl,
                position: player.position,
                summary: player.summary,
                averageRating: player.averageRating,
                viewerRating: player.viewerRating ?? null
              }))}
            finalResults={{
              topVoted: topVoted.map((player) => ({
                id: player.id,
                nickname: player.nickname,
                photoUrl: player.photoUrl,
                position: player.position,
                summary: player.summary,
                averageRating: player.averageRating,
                rankValue: player.votes,
                rankLabel: `${player.votes} votos · ${player.percent}%`
              })),
              ownVoteRank,
              topScorers: topScorers.map((player) => ({
                id: player.id,
                nickname: player.nickname,
                photoUrl: player.photoUrl,
                position: player.position,
                summary: player.summary,
                averageRating: player.averageRating,
                rankValue: player.totalGoals,
                rankLabel: `${player.totalGoals} gols`
              })),
              ownScorerRank
            }}
          />
        ) : null}

        {!isParticipant ? (
          <>
            <div className="mb-2">
              <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Craque</p>
              <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">Votacao de craque</h2>
            </div>

            {poll && leader ? (
              <>
                <Card className="border-2 border-craque p-3">
                  <div className="mb-1 inline-flex items-center gap-1 rounded-[7px] bg-craque px-2 py-1 text-[10px] font-black uppercase text-mata">
                    <Star size={12} fill="currentColor" /> Na frente
                  </div>
                  <div className="flex items-center gap-3">
                    <PlayerAvatar src={leader.photoUrl} name={leader.nickname} position={leader.position} number={10} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="truncate font-extrabold">{leader.nickname}</h2>
                        <strong className="font-jersey text-2xl">{leader.percent}%</strong>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-areia">
                        <div className="h-full rounded-full bg-craque" style={{ width: `${Math.max(leader.percent, totalVotes ? 8 : 0)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-musgo">
                        {leader.votes} votos · nota media {leader.averageRating?.toFixed(1) ?? "-"}
                      </p>
                    </div>
                  </div>
                </Card>

                {candidates.map((player) => {
                  const selected = ownCraqueVote?.playerId === player.id;
                  return (
                    <Card key={player.id} className={cn("p-3", selected && "border-2 border-campo bg-[#EAF5EC]")}>
                      <div className="flex items-center gap-3">
                        <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-extrabold">{player.nickname}</h2>
                          <p className="text-xs text-musgo">
                            {player.summary} · nota {player.averageRating?.toFixed(1) ?? "-"}
                          </p>
                        </div>
                        {selected ? (
                          <span className="rounded-[10px] bg-campo px-3 py-2 text-xs font-bold text-white">Seu voto</span>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </>
            ) : null}
          </>
        ) : null}

        {showStandaloneRatings ? (
          <>
            <div className="mb-2">
              <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Notas</p>
              <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">Avaliar jogadores</h2>
            </div>

            {poll ? (
              <div className="space-y-2.5">
                {candidates.map((player) => (
                  <Card key={player.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-extrabold">{player.nickname}</h2>
                        <p className="text-xs text-musgo">Nota media {player.averageRating?.toFixed(1) ?? "-"}</p>
                      </div>
                    </div>
                    {votingOpen && player.viewerRating == null ? (
                      <RatePlayerForm matchId={id} playerId={player.id} defaultValue={3} />
                    ) : null}
                    {player.viewerRating != null ? (
                      <p className="mt-3 rounded-[10px] bg-areia px-3 py-2 text-xs font-bold text-musgo">
                        Sua nota: {player.viewerRating.toFixed(1)}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-musgo">As notas ficam disponiveis quando a votacao for aberta.</p>
              </Card>
            )}
          </>
        ) : null}

      </section>

    </AppShell>
  );
}
