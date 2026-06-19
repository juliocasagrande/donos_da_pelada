import { Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { RatePlayerForm } from "@/components/matches/RatePlayerForm";
import { VoteCraqueForm } from "@/components/matches/VoteCraqueForm";
import {
  closeExpiredCraquePolls,
  closeCraquePoll,
  createCraquePoll,
  notifyStatsEntryOpen,
  submitOwnMatchStats,
  updateMatchScore,
  updateStats
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { VOTING_WINDOW_HOURS } from "@/lib/attendance";

function isVotingOpen(createdAt?: Date, status?: string) {
  if (!createdAt || status !== "OPEN") return false;
  return Date.now() - createdAt.getTime() <= VOTING_WINDOW_HOURS * 60 * 60 * 1000;
}

function votingEndsAt(createdAt?: Date) {
  if (!createdAt) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(createdAt.getTime() + VOTING_WINDOW_HOURS * 60 * 60 * 1000));
}

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await closeExpiredCraquePolls(user.peladaId!);
  const isAdmin = isPeladaAdmin(user);
  const { id } = await params;
  const [match, players, poll, linkedPlayer, latestClosedMatch] = await Promise.all([
    prisma.match.findFirst({ where: { id, peladaId: user.peladaId! } }),
    prisma.player.findMany({
      where: {
        peladaId: user.peladaId!,
        active: true,
        OR: [
          { membershipStatus: "MENSALISTA" },
          ...(isAdmin ? [{ userId: user.id }] : [])
        ],
        AND: {
          OR: [
            { attendances: { some: { matchId: id, status: "CONFIRMED" } } },
            { teamPlayers: { some: { team: { matchId: id } } } }
          ]
        }
      },
      include: {
        goals: { where: { matchId: id } },
        defenses: { where: { matchId: id } },
        ratings: { where: { matchId: id }, include: { user: true } },
        matchSubmissions: { where: { matchId: id } }
      },
      orderBy: { nickname: "asc" }
    }),
    prisma.poll.findFirst({
      where: { matchId: id, title: "Craque da pelada" },
      orderBy: { createdAt: "desc" },
      include: { votes: true, winner: true }
    }),
    prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } }),
    prisma.match.findFirst({
      where: { peladaId: user.peladaId!, status: "CLOSED" },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      select: { id: true }
    })
  ]);

  const viewerAttendance = linkedPlayer
    ? await prisma.attendance.findUnique({ where: { matchId_playerId: { matchId: id, playerId: linkedPlayer.id } } })
    : null;
  const canVote =
    viewerAttendance?.status === "CONFIRMED" &&
    linkedPlayer?.active === true &&
    linkedPlayer?.membershipStatus === "MENSALISTA";
  const votingOpen = isVotingOpen(poll?.createdAt, poll?.status);
  const ownPlayer = linkedPlayer ? players.find((player) => player.id === linkedPlayer.id) : null;
  const ownSubmitted = Boolean(ownPlayer?.matchSubmissions.some((submission) => submission.userId === user.id));
  const ownCraqueVote = poll?.votes.find((vote) => vote.userId === user.id);
  const canAdminEditStats = isAdmin && latestClosedMatch?.id === id;

  const voteCounts = new Map<string, number>();
  for (const vote of poll?.votes ?? []) {
    voteCounts.set(vote.playerId, (voteCounts.get(vote.playerId) ?? 0) + 1);
  }

  const totalVotes = poll?.votes.length ?? 0;
  const candidates = players
    .map((player) => {
      const votes = voteCounts.get(player.id) ?? 0;
      const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
      const defenses = player.defenses.reduce((sum, item) => sum + item.quantity, 0);
      const viewerRating = player.ratings.find((rating) => rating.userId === user.id)?.value;
      const averageRating = player.ratings.length
        ? player.ratings.reduce((sum, rating) => sum + rating.value, 0) / player.ratings.length
        : null;
      return {
        ...player,
        votes,
        percent: totalVotes ? Math.round((votes / totalVotes) * 100) : 0,
        averageRating,
        viewerRating,
        summary: player.position === "GOLEIRO" ? `${defenses} defesas dificeis` : `${goals} gols`
      };
    })
    .sort((a, b) => b.votes - a.votes || (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.rating - a.rating);
  const leader = candidates[0];
  const eligiblePlayers = players.filter((player) => player.userId && player.active && player.membershipStatus === "MENSALISTA");
  const eligibleUserIds = [...new Set(eligiblePlayers.map((player) => player.userId!).filter(Boolean))];
  const eligiblePlayerIds = eligiblePlayers.map((player) => player.id);
  const completedUserIds = new Set(
    eligiblePlayers
      .filter((player) => {
        const userId = player.userId!;
        const submitted = players.some((candidate) =>
          candidate.matchSubmissions.some((submission) => submission.userId === userId)
        );
        const voted = Boolean(poll?.votes.some((vote) => vote.userId === userId));
        const ratedPlayerIds = new Set(
          players
            .flatMap((candidate) => candidate.ratings)
            .filter((rating) => rating.userId === userId)
            .map((rating) => rating.playerId)
        );
        const expectedRatings = eligiblePlayerIds.filter((playerId) => playerId !== player.id);
        return submitted && voted && expectedRatings.every((playerId) => ratedPlayerIds.has(playerId));
      })
      .map((player) => player.userId!)
  );
  const pendingResponses = Math.max(0, eligibleUserIds.length - completedUserIds.size);
  const votingMsLeft = poll?.createdAt
    ? Math.max(0, poll.createdAt.getTime() + VOTING_WINDOW_HOURS * 60 * 60 * 1000 - Date.now())
    : 0;
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
            ? `Aberta ate ${votingEndsAt(poll?.createdAt)} para craque e notas.`
            : match?.status === "CLOSED"
              ? "A janela de 1 hora terminou ou todos responderam."
              : "A votacao abre automaticamente quando o admin fechar a pelada."}
        </p>
      </section>

      <section className="-mt-5 mb-5 space-y-2.5">
        {poll && canVote && votingOpen && (ownCraqueVote || ownSubmitted) ? (
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

        {canVote && votingOpen && ownPlayer && !ownSubmitted ? (
          <Card className="border-2 border-campo p-4">
            <h2 className="font-display text-xl font-extrabold">Seus numeros na pelada</h2>
            <p className="mb-3 text-sm text-musgo">Informe seus gols e defesas. Depois de enviar, esta etapa fecha para voce.</p>
            <form action={submitOwnMatchStats.bind(null, id)} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-musgo">
                  Gols
                  <Input name="goals" type="number" min={0} defaultValue={ownPlayer.goals[0]?.quantity || 0} />
                </label>
                <label className="text-xs font-semibold text-musgo">
                  Defesas
                  <Input name="defenses" type="number" min={0} defaultValue={ownPlayer.defenses[0]?.quantity || 0} />
                </label>
              </div>
              <Button type="submit" className="w-full">Enviar meus numeros</Button>
            </form>
          </Card>
        ) : null}

        {canVote && votingOpen && ownSubmitted ? (
          <Card className="border border-campo/20 bg-[#EAF5EC]">
            <p className="text-sm font-bold text-mata">Seus numeros ja foram enviados.</p>
          </Card>
        ) : null}

        {isAdmin ? (
          <div>
            <div className="mb-2">
              <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Admins</p>
              <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">Controle da votacao</h2>
            </div>
            <Card className="border-2 border-craque p-4">
              {!poll ? (
                <>
                  <p className="mb-3 text-sm text-musgo">Abre craque da pelada, gols/defesas e notas dos presentes por 1 hora.</p>
                  <form action={createCraquePoll.bind(null, id)}>
                    <Button className="w-full">Criar votacao</Button>
                  </form>
                </>
              ) : poll.status === "OPEN" ? (
                <>
                  <p className="mb-3 text-sm text-musgo">A votacao esta aberta. Encerre para publicar o craque.</p>
                  <form action={closeCraquePoll.bind(null, poll.id)}>
                    <Button className="w-full">Encerrar e publicar craque</Button>
                  </form>
                </>
              ) : (
                <p className="text-sm font-semibold text-musgo">Votacao encerrada e publicada.</p>
              )}
            </Card>
          </div>
        ) : null}

        {false && !poll && isAdmin ? (
          <Card className="border-2 border-craque p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-jersey text-xs font-bold uppercase tracking-[.12em] text-craque">Enquete</p>
                <h2 className="font-display text-xl font-extrabold">Abrir votacao</h2>
              </div>
              <Star className="text-craque" fill="currentColor" />
            </div>
            <p className="mb-3 text-sm text-musgo">Abre craque da pelada, gols/defesas e notas dos presentes por 1 hora.</p>
            <form action={createCraquePoll.bind(null, id)}>
              <Button className="w-full">Criar votacao</Button>
            </form>
          </Card>
        ) : null}

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
                    {canVote && votingOpen && linkedPlayer?.id !== player.id && !ownCraqueVote ? (
                      <VoteCraqueForm pollId={poll.id} playerId={player.id} />
                    ) : null}
                    {selected ? (
                      <span className="rounded-[10px] bg-campo px-3 py-2 text-xs font-bold text-white">Seu voto</span>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </>
        ) : null}

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
                {canVote && votingOpen && linkedPlayer?.id !== player.id && player.viewerRating == null ? (
                  <RatePlayerForm matchId={id} playerId={player.id} defaultValue={7} />
                ) : null}
                {canVote && player.viewerRating != null ? (
                  <p className="mt-3 rounded-[10px] bg-areia px-3 py-2 text-xs font-bold text-musgo">
                    Sua nota: {player.viewerRating.toFixed(1)}
                  </p>
                ) : null}
                {isAdmin && player.ratings.length ? (
                  <div className="mt-3 rounded-[10px] bg-areia px-3 py-2 text-xs text-musgo">
                    <p className="mb-1 font-bold text-tinta">Notas recebidas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {player.ratings.map((rating) => (
                        <span key={rating.id} className="rounded-full bg-white px-2 py-1 font-semibold">
                          {rating.user.name || rating.user.email || "Jogador"}: {rating.value.toFixed(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-musgo">As notas ficam disponiveis quando a votacao for aberta.</p>
          </Card>
        )}
      </section>

      {isAdmin ? (
        <>
          {!canAdminEditStats ? (
            <Card className="mb-4 border border-craque/30 bg-[#FFF7E6]">
              <p className="text-sm font-semibold text-[#8a5a06]">
                Ajustes de sumula ficam disponiveis apenas para a ultima pelada encerrada.
              </p>
            </Card>
          ) : null}

          {canAdminEditStats && match?.kind === "AMISTOSO" ? (
            <Card className="mb-4 border-2 border-campo p-4">
              <p className="font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">Amistoso</p>
              <h2 className="font-display text-xl font-extrabold">Placar final</h2>
              <p className="mb-3 text-sm text-musgo">
                Salve o placar contra {match.opponentName || "o adversario"}.
              </p>
              <form action={updateMatchScore.bind(null, id)} className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <label className="text-xs font-semibold text-musgo">
                  {match.title}
                  <Input name="homeScore" type="number" min={0} defaultValue={match.homeScore ?? ""} />
                </label>
                <span className="pb-3 text-sm font-black text-musgo">x</span>
                <label className="text-xs font-semibold text-musgo">
                  {match.opponentName || "Adversario"}
                  <Input name="awayScore" type="number" min={0} defaultValue={match.awayScore ?? ""} />
                </label>
                <div className="col-span-3">
                  <Button className="w-full" type="submit">Salvar placar</Button>
                </div>
              </form>
            </Card>
          ) : null}

          <div className="mb-3">
            <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Sumula</p>
            <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">Gols e defesas</h2>
          </div>

          {canAdminEditStats ? (
            <>
              <form action={notifyStatsEntryOpen.bind(null, id)} className="mb-4">
                <Button className="w-full" type="submit">Avisar abertura dos lancamentos</Button>
              </form>

              <Card>
                <form action={updateStats.bind(null, id)} className="space-y-3">
                  {players.map((player) => (
                    <div key={player.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-[13px] bg-areia p-3">
                      <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
                      <div>
                        <h2 className="font-black">{player.nickname}</h2>
                        <input type="hidden" name="playerId" value={player.id} />
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="text-xs text-musgo">Gols<Input name={`goals-${player.id}`} type="number" min={0} defaultValue={player.goals[0]?.quantity || 0} /></label>
                          <label className="text-xs text-musgo">Defesas<Input name={`defenses-${player.id}`} type="number" min={0} defaultValue={player.defenses[0]?.quantity || 0} /></label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full" type="submit">Salvar estatisticas</Button>
                </form>
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}
