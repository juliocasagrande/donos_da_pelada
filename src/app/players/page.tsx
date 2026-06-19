import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerList } from "@/components/players/PlayerList";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";

export default async function PlayersPage() {
  const user = await requireUser();
  const isAdmin = isPeladaAdmin(user);
  const players = await prisma.player.findMany({
    where: { peladaId: user.peladaId!, active: true },
    include: { goals: true, defenses: true, user: { select: { whatsapp: true, whatsappChatEnabled: true } } },
    orderBy: [{ nickname: "asc" }]
  });

  const playerListItems = players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    photoUrl: player.photoUrl,
    position: player.position,
    membershipStatus: player.membershipStatus,
    ratingAssigned: player.ratingAssigned,
    whatsapp: player.user?.whatsappChatEnabled ? player.user.whatsapp : null,
    goals: player.goals.reduce((sum, item) => sum + item.quantity, 0),
    saves: player.defenses.reduce((sum, item) => sum + item.quantity, 0)
  }));

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-3 pt-1">
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Jogadores</h1>
        {isAdmin ? (
          <Link href="/players/new">
            <Button className="h-11 w-11 rounded-[13px] px-0 shadow-button" aria-label="Novo jogador">
              <Plus size={20} />
            </Button>
          </Link>
        ) : null}
      </div>

      <PlayerList players={playerListItems} isAdmin={isAdmin} />
    </AppShell>
  );
}
