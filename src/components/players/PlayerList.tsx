"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Search } from "lucide-react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

function positionLabel(position: string) {
  const labels: Record<string, string> = {
    GOLEIRO: "Goleiro",
    DEFESA: "Zagueiro",
    MEIA: "Meia",
    ATAQUE: "Atacante"
  };
  return labels[position] || position;
}

export type PlayerListItem = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  position: string;
  membershipStatus: string;
  ratingAssigned: boolean;
  goals: number;
  saves: number;
};

type FilterKey = "TODOS" | "LINHA" | "GOLEIROS";

export function PlayerList({ players, isAdmin }: { players: PlayerListItem[]; isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("TODOS");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return players.filter((player) => {
      if (filter === "GOLEIROS" && player.position !== "GOLEIRO") return false;
      if (filter === "LINHA" && player.position === "GOLEIRO") return false;
      if (!normalizedQuery) return true;
      return (
        player.name.toLowerCase().includes(normalizedQuery) ||
        (player.nickname || "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [players, query, filter]);

  const goalkeeperCount = players.filter((player) => player.position === "GOLEIRO").length;
  const lineCount = players.length - goalkeeperCount;

  return (
    <>
      <div className="mb-3 flex items-center gap-2 rounded-[13px] bg-white px-3.5 py-3.5 shadow-card">
        <Search size={18} className="text-[#A7AFA1]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar jogador..."
          className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-musgo/70"
        />
      </div>

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setFilter("TODOS")}>
          <Chip active={filter === "TODOS"}>Todos · {players.length}</Chip>
        </button>
        <button type="button" onClick={() => setFilter("LINHA")}>
          <Chip active={filter === "LINHA"}>Linha · {lineCount}</Chip>
        </button>
        <button type="button" onClick={() => setFilter("GOLEIROS")}>
          <Chip active={filter === "GOLEIROS"}>Goleiros · {goalkeeperCount}</Chip>
        </button>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-musgo">Nenhum jogador encontrado.</p>
        ) : null}
        {filtered.map((player, index) => {
          const isGuest = player.membershipStatus === "CONVIDADO";
          const stat = isGuest ? 0 : player.position === "GOLEIRO" ? player.saves : player.goals;

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
    </>
  );
}
