import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function TeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const match = await prisma.match.findFirst({ where: { id, peladaId: admin.peladaId! }, select: { id: true } });
  if (!match) notFound();
  const teams = await prisma.team.findMany({
    where: { matchId: id },
    include: { players: { include: { player: true } } },
    orderBy: { name: "asc" }
  });
  const totals = teams.map((team) => team.totalRating);
  const balance = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Times</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Resultado do sorteio</h1></div>
        <Link href={`/matches/${id}/draw`}><Button variant="secondary">Refazer</Button></Link>
      </div>
      {teams.length ? <p className="mb-4 text-sm text-musgo">Diferenca entre somas: {balance.toFixed(1)} ponto(s).</p> : null}
      <div className="stagger grid gap-4">
        {teams.map((team, teamIndex) => (
          <Card key={team.id} className="animate-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-extrabold">{team.name}</h2>
              <span className="rounded-lg bg-craque px-2.5 py-1 font-jersey text-lg font-bold text-tinta">{team.totalRating.toFixed(1)}</span>
            </div>
            <p className="mb-3 text-sm text-musgo">Media {(team.totalRating / Math.max(team.players.length, 1)).toFixed(1)}</p>
            <div className="space-y-2">
              {team.players.map(({ player }, playerIndex) => (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-2 rounded-[13px] bg-areia p-2",
                    teamIndex % 2 === 0 ? "slide-in-left" : "slide-in-right"
                  )}
                  style={{ animationDelay: `${150 + playerIndex * 70}ms` }}
                >
                  <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{player.nickname}</p>
                    <p className="text-xs text-musgo">
                      {player.position} · {player.rating} · {player.membershipStatus === "MENSALISTA" ? "mensalista" : "convidado"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {teams.length ? <Link href={`/matches/${id}/stats`} className="mt-4 block"><Button className="w-full">Registrar gols e participacoes</Button></Link> : null}
    </AppShell>
  );
}
