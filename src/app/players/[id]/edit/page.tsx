import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerForm } from "@/components/forms/PlayerForm";
import { DeletePlayerForm } from "@/components/players/DeletePlayerForm";
import { Card } from "@/components/ui/Card";
import { updatePlayer } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) notFound();
  return (
    <AppShell>
      <div className="mb-5"><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Editar</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">{player.name}</h1></div>
      <Card className="mx-auto max-w-md">
        <PlayerForm action={updatePlayer.bind(null, player.id)} player={player} submitLabel="Salvar alteracoes" canEditMembershipStatus />
      </Card>
      <Card className="mx-auto mt-4 max-w-md">
        <DeletePlayerForm playerId={player.id} playerName={player.nickname || player.name} />
      </Card>
    </AppShell>
  );
}
