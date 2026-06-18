import Link from "next/link";
import { ChevronRight, Pencil, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function positionLabel(position: string) {
  const labels: Record<string, string> = {
    GOLEIRO: "Goleiro",
    DEFESA: "Zagueiro",
    MEIA: "Meia",
    ATAQUE: "Atacante"
  };
  return labels[position] || position;
}

export default async function PlayersPage() {
  const user = await requireUser();
  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  const players = await prisma.player.findMany({
    where: { active: true },
    include: { goals: true, defenses: true },
    orderBy: [{ name: "asc" }]
  });

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

      <div className="mb-3 flex items-center gap-2 rounded-[13px] bg-white px-3.5 py-3.5 shadow-card">
        <Search size={18} className="text-[#A7AFA1]" />
        <span className="text-musgo/70">Buscar jogador...</span>
      </div>

      <div className="mb-4 flex gap-2">
        <Chip active>Todos · {players.length}</Chip>
        <Chip>Linha</Chip>
        <Chip>Goleiros</Chip>
      </div>

      <div className="space-y-2.5">
        {players.map((player, index) => {
          const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
          const saves = player.defenses.reduce((sum, item) => sum + item.quantity, 0);
          const isGuest = player.membershipStatus === "CONVIDADO";
          const stat = isGuest ? 0 : player.position === "GOLEIRO" ? saves : goals;

          return (
            <Card key={player.id} className="animate-card p-3">
              <div className="flex items-center gap-3">
                <Link href={`/players/${player.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <PlayerAvatar
                    src={player.photoUrl}
                    name={player.name}
                    position={player.position}
                    number={index === 0 ? 10 : undefined}
                    className={index === 0 ? "bg-mata" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-extrabold">{player.nickname || player.name}</h2>
                    <p className="truncate text-xs text-musgo">
                      {positionLabel(player.position)}
                      {player.membershipStatus === "MENSALISTA" ? " · Mensalista" : " · Convidado"}
                    </p>
                    {isAdmin && !player.ratingAssigned ? (
                      <span className="mt-1 inline-flex rounded-[6px] bg-craque/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#8a5a06]">
                        Sem nota
                      </span>
                    ) : null}
                  </div>
                  <div className="w-10 text-right">
                    <div className="font-jersey text-xl font-bold leading-none">{stat}</div>
                    <div className="mt-1 text-[10px] uppercase leading-none text-[#A7AFA1]">
                      {isGuest ? "fora" : player.position === "GOLEIRO" ? "def" : "gols"}
                    </div>
                  </div>
                  <ChevronRight size={17} className="text-[#C7CDC0]" />
                </Link>
                {isAdmin ? (
                  <Link
                    href={`/players/${player.id}/edit`}
                    className="rounded-[10px] bg-areia p-2 text-musgo"
                    aria-label="Editar jogador"
                  >
                    <Pencil size={16} />
                  </Link>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
