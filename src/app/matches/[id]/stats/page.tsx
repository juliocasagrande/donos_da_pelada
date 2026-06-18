import { Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  closeCraquePoll,
  createCraquePoll,
  notifyStatsEntryOpen,
  ratePlayerPerformance,
  submitOwnMatchStats,
  updateStats,
  voteCraque
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const VOTING_WINDOW_HOURS = 6;

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
  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  const { id } = await params;
  const [match, players, poll, linkedPlayer] = await Promise.all([
    prisma.match.findUnique({ where: { id } }),
    prisma.player.findMany({
      where: {
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
      orderBy: { name: "asc" }
    }),
    prisma.poll.findFirst({
      where: { matchId: id, title: "Craque da pelada" },
      orderBy: { createdAt: "desc" },
      include: { votes: true, winner: true }
    }),
    prisma.player.findUnique({ where: { userId: user.id } })
  ]);

  const viewerAttendance = linkedPlayer
    ? await prisma.attendance.findUnique({ where: { matchId_playerId: { matchId: id, playerId: linkedPlayer.id } } })
    : null;
  const canVote =
    viewerAttendance?.status === "CONFIRMED" &&
    (linkedPlayer?.membershipStatus === "MENSALISTA" || isAdmin);
  const votingOpen = isVotingOpen(poll?.createdAt, poll?.status);
  const ownPlayer = linkedPlayer ? players.find((player) => player.id === linkedPlayer.id) : null;
  const ownSubmitted = Boolean(ownPlayer?.matchSubmissions.some((submission) => submission.userId === user.id));
  const ownCraqueVote = poll?.votes.find((vote) => vote.userId === user.id);

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

  return (
    <AppShell>
      <section className="-mx-5 -mt-5 bg-gradient-to-br from-tinta to-mata px-5 pb-7 pt-5 text-white">
        <p className="mb-2 inline-flex items-center gap-2 rounded-[8px] bg-craque/20 px-3 py-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-craque">
          <span className="h-1.5 w-1.5 rounded-full bg-craque" /> {votingOpen ? "Votacao aberta" : "Votacao encerrada"}
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Craque da pelada</h1>
        <p className="mt-1 text-sm font-semibold text-green-100">
          {votingOpen
            ? `Aberta ate ${votingEndsAt(poll?.createdAt)} para craque e notas.`
            : match?.status === "CLOSED"
              ? "A janela de 6 horas terminou ou foi encerrada."
              : "A votacao abre automaticamente quando o admin fechar a pelada."}
        </p>
      </section>

      <section className="-mt-5 mb-5 space-y-2.5">
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

        {!poll && isAdmin ? (
          <Card className="border-2 border-craque p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-jersey text-xs font-bold uppercase tracking-[.12em] text-craque">Enquete</p>
                <h2 className="font-display text-xl font-extrabold">Abrir votacao</h2>
              </div>
              <Star className="text-craque" fill="currentColor" />
            </div>
            <p className="mb-3 text-sm text-musgo">Abre craque da pelada e notas dos presentes por 6 horas.</p>
            <form action={createCraquePoll.bind(null, id)}>
              <Button className="w-full">Criar votacao</Button>
            </form>
          </Card>
        ) : null}

        {poll && leader ? (
          <>
            <Card className="border-2 border-craque p-3">
              <div className="mb-1 inline-flex items-center gap-1 rounded-[7px] bg-craque px-2 py-1 text-[10px] font-black uppercase text-mata">
                <Star size={12} fill="currentColor" /> Na frente
              </div>
              <div className="flex items-center gap-3">
                <PlayerAvatar src={leader.photoUrl} name={leader.name} position={leader.position} number={10} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate font-extrabold">{leader.nickname || leader.name}</h2>
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
                    <PlayerAvatar src={player.photoUrl} name={player.name} position={player.position} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-extrabold">{player.nickname || player.name}</h2>
                      <p className="text-xs text-musgo">
                        {player.summary} · nota {player.averageRating?.toFixed(1) ?? "-"}
                      </p>
                    </div>
                    {canVote && votingOpen && linkedPlayer?.id !== player.id && !ownCraqueVote ? (
                      <form action={voteCraque.bind(null, poll.id, player.id)}>
                        <Button variant="ghost" type="submit" className="px-4 py-2 text-campo">Votar</Button>
                      </form>
                    ) : null}
                    {selected ? (
                      <span className="rounded-[10px] bg-campo px-3 py-2 text-xs font-bold text-white">Seu voto</span>
                    ) : null}
                  </div>
                  {canVote && votingOpen && linkedPlayer?.id !== player.id && player.viewerRating == null ? (
                    <form action={ratePlayerPerformance.bind(null, id, player.id)} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <select
                        name="rating"
                        defaultValue={player.viewerRating ?? 7}
                        className="min-h-10 rounded-[11px] border-[1.5px] border-linha bg-white px-3 text-sm font-bold outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                      <Button type="submit" variant="secondary">Dar nota</Button>
                    </form>
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
              );
            })}

            {isAdmin && poll.status === "OPEN" ? (
              <form action={closeCraquePoll.bind(null, poll.id)}>
                <Button className="w-full">Encerrar e publicar craque</Button>
              </form>
            ) : null}
          </>
        ) : null}
      </section>

      {isAdmin ? (
        <>
          <div className="mb-3">
            <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Sumula</p>
            <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">Gols e defesas</h2>
          </div>

          <form action={notifyStatsEntryOpen.bind(null, id)} className="mb-4">
            <Button className="w-full" type="submit">Avisar abertura dos lancamentos</Button>
          </form>

          <Card>
            <form action={updateStats.bind(null, id)} className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-[13px] bg-areia p-3">
                  <PlayerAvatar src={player.photoUrl} name={player.name} position={player.position} />
                  <div>
                    <h2 className="font-black">{player.nickname || player.name}</h2>
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
    </AppShell>
  );
}
