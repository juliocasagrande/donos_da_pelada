import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MatchScoreForm } from "@/components/matches/MatchScoreForm";
import { MatchStatsForm } from "@/components/matches/MatchStatsForm";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function MatchSumulaPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [match, players, latestClosedMatch] = await Promise.all([
    prisma.match.findFirst({ where: { id, peladaId: admin.peladaId!, deletedAt: null } }),
    prisma.player.findMany({
      where: {
        peladaId: admin.peladaId!,
        active: true,
        attendances: { some: { matchId: id, status: "CONFIRMED" } }
      },
      include: {
        goals: { where: { matchId: id } },
        defenses: { where: { matchId: id } }
      },
      orderBy: { nickname: "asc" }
    }),
    prisma.match.findFirst({
      where: { peladaId: admin.peladaId!, status: "CLOSED", deletedAt: null },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      select: { id: true }
    })
  ]);

  if (!match) notFound();
  const canAdminEditStats = latestClosedMatch?.id === id;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Sumula</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Gols e defesas</h1>
        <p className="mt-1 text-sm text-musgo">{match.title}</p>
      </div>

      {!canAdminEditStats ? (
        <Card className="mb-4 border border-craque/30 bg-[#FFF7E6]">
          <p className="text-sm font-semibold text-[#8a5a06]">
            Ajustes de sumula ficam disponiveis apenas para a ultima pelada encerrada.
          </p>
        </Card>
      ) : null}

      {canAdminEditStats && match.kind === "AMISTOSO" ? (
        <Card className="mb-4 border-2 border-campo p-4">
          <p className="font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">Amistoso</p>
          <h2 className="font-display text-xl font-extrabold">Placar final</h2>
          <p className="mb-3 text-sm text-musgo">
            Salve o placar contra {match.opponentName || "o adversario"}.
          </p>
          <MatchScoreForm
            matchId={id}
            homeName={match.title}
            awayName={match.opponentName || "Adversario"}
            homeScore={match.homeScore}
            awayScore={match.awayScore}
          />
        </Card>
      ) : null}

      {canAdminEditStats ? (
        <Card>
          <MatchStatsForm
            matchId={id}
            players={players.map((player) => ({
              id: player.id,
              nickname: player.nickname,
              photoUrl: player.photoUrl,
              position: player.position,
              goals: player.goals[0]?.quantity || 0,
              defenses: player.defenses[0]?.quantity || 0
            }))}
          />
        </Card>
      ) : null}
    </AppShell>
  );
}
