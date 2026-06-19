import { AppShell } from "@/components/layout/AppShell";
import { DrawTeamsForm } from "@/components/forms/DrawTeamsForm";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function DrawPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const [presentCount, players] = await Promise.all([
    prisma.attendance.count({ where: { matchId: id, status: "CONFIRMED" } }),
    prisma.player.findMany({
      where: { peladaId: admin.peladaId!, active: true },
      include: { attendances: { where: { matchId: id } } },
      orderBy: [{ membershipStatus: "asc" }, { nickname: "asc" }]
    })
  ]);

  const drawPlayers = players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    position: player.position,
    rating: player.rating,
    membershipStatus: player.membershipStatus,
    present: player.attendances[0]?.status === "CONFIRMED"
  }));

  return (
    <AppShell>
      <div className="mb-5"><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Sorteio</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Times balanceados</h1><p className="text-musgo">{presentCount} jogadores presentes</p></div>
      <Card className="mx-auto max-w-md">
        {error ? (
          <div className="mb-3 rounded-[13px] border border-ausente/30 bg-ausente/10 p-3 text-sm font-semibold text-ausente">
            {error}
          </div>
        ) : null}
        <DrawTeamsForm matchId={id} players={drawPlayers} />
        {presentCount ? (
          <p className="mt-3 text-sm text-musgo">
            Se houver jogadores sobrando, mensalistas entram primeiro e convidados so entram depois que todos os mensalistas forem considerados.
          </p>
        ) : null}
      </Card>
    </AppShell>
  );
}
