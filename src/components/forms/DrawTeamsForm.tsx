"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { CircleDot, Footprints, Hand, Shield } from "lucide-react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Input, Label } from "@/components/ui/Input";
import { drawTeamsForClient } from "@/lib/actions";
import { cn } from "@/lib/utils";

type DrawPlayer = {
  id: string;
  name: string;
  nickname?: string | null;
  position: string;
  rating: number;
  membershipStatus: string;
  present: boolean;
};

function getPositionMeta(position: string) {
  if (position === "GOLEIRO") return { label: "Goleiro", icon: Hand, color: "text-[#DC8A1A]" };
  if (position === "DEFESA") return { label: "Defesa", icon: Shield, color: "text-mata" };
  if (position === "MEIA") return { label: "Meia", icon: Footprints, color: "text-campo" };
  return { label: "Atacante", icon: CircleDot, color: "text-craque" };
}

function PlayerSelectionCard({ player }: { player: DrawPlayer }) {
  const [present, setPresent] = useState(player.present);
  const [membershipStatus, setMembershipStatus] = useState(player.membershipStatus);
  const position = getPositionMeta(player.position);
  const PositionIcon = position.icon;

  return (
    <div className="rounded-card bg-areia p-3 shadow-card">
      <input type="hidden" name="playerId" value={player.id} />
      <input type="hidden" name={`membershipStatus-${player.id}`} value={membershipStatus} />
      {present ? <input type="hidden" name="presentPlayerId" value={player.id} /> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPresent((current) => !current)}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-[1.5px] transition",
            present ? "border-campo bg-campo text-white" : "border-linha bg-white text-transparent"
          )}
          aria-pressed={present}
          title={present ? "Presente" : "Ausente"}
        >
          <span className="text-lg font-black leading-none">✓</span>
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-tinta">{player.nickname || player.name}</h3>
          <p className="text-xs font-semibold text-musgo">{present ? "Presente" : "Ausente"}</p>
        </div>

        <span className="font-jersey text-2xl font-bold text-musgo">{player.rating}</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1.45fr] gap-2">
        <div className="flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-white px-2 text-center text-sm font-semibold text-musgo">
          <PositionIcon size={17} className={position.color} />
          <span>{position.label}</span>
        </div>

        <div className="grid grid-cols-2 rounded-[13px] border-[1.5px] border-linha bg-white p-1">
          <button
            type="button"
            onClick={() => setMembershipStatus("MENSALISTA")}
            className={cn(
              "rounded-[10px] px-2 py-2 text-xs font-bold transition",
              membershipStatus === "MENSALISTA" ? "bg-campo text-white shadow-card" : "text-musgo"
            )}
          >
            Mensalista
          </button>
          <button
            type="button"
            onClick={() => setMembershipStatus("CONVIDADO")}
            className={cn(
              "rounded-[10px] px-2 py-2 text-xs font-bold transition",
              membershipStatus === "CONVIDADO" ? "bg-craque text-tinta shadow-card" : "text-musgo"
            )}
          >
            Convidado
          </button>
        </div>
      </div>
    </div>
  );
}

export function DrawTeamsForm({ matchId, players }: { matchId: string; players: DrawPlayer[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await drawTeamsForClient(matchId, formData);

      if (result.ok && result.url) {
        router.push(result.url);
        router.refresh();
        return;
      }

      setError(result.error || "Nao foi possivel sortear os times.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? (
        <div className="rounded-[13px] border border-ausente/30 bg-ausente/10 p-3 text-sm font-semibold text-ausente">
          {error}
        </div>
      ) : null}
      <div>
        <Label>Quantidade de times</Label>
        <Input name="numberOfTeams" type="number" min={2} defaultValue={2} required />
      </div>
      <div>
        <Label>Jogadores por time</Label>
        <Input name="desiredPlayersPerTeam" type="number" min={1} defaultValue={2} required />
      </div>
      <div className="space-y-2">
        <div>
          <h2 className="font-display text-lg font-bold">Selecao final</h2>
          <p className="text-sm text-musgo">Marque quem esta presente e confirme se e mensalista ou convidado.</p>
        </div>
        {players.map((player) => (
          <PlayerSelectionCard key={player.id} player={player} />
        ))}
      </div>
      <SubmitButton className="w-full" pendingLabel="Gerando times...">
        {isPending ? "Gerando times..." : "Gerar times"}
      </SubmitButton>
    </form>
  );
}
