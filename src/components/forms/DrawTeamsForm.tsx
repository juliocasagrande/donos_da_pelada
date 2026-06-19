"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { CircleDot, Footprints, Hand, Shield } from "lucide-react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Label } from "@/components/ui/Input";
import { drawTeamsForClient } from "@/lib/actions";
import { cn } from "@/lib/utils";

type DrawPlayer = {
  id: string;
  nickname: string;
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

function PlayerSelectionCard({
  player,
  onPresenceChange
}: {
  player: DrawPlayer;
  onPresenceChange: (playerId: string, present: boolean) => void;
}) {
  const [present, setPresent] = useState(player.present);
  const [membershipStatus, setMembershipStatus] = useState(player.membershipStatus);
  const position = getPositionMeta(player.position);
  const PositionIcon = position.icon;

  return (
    <div className="animate-card rounded-card bg-areia p-3 shadow-card">
      <input type="hidden" name="playerId" value={player.id} />
      <input type="hidden" name={`membershipStatus-${player.id}`} value={membershipStatus} />
      {present ? <input type="hidden" name="presentPlayerId" value={player.id} /> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setPresent((current) => {
              const next = !current;
              onPresenceChange(player.id, next);
              return next;
            });
          }}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-[1.5px] transition active:scale-90",
            present ? "pop-scale border-campo bg-campo text-white" : "border-linha bg-white text-transparent"
          )}
          aria-pressed={present}
          title={present ? "Presente" : "Ausente"}
        >
          <span className="text-lg font-black leading-none">✓</span>
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-tinta">{player.nickname}</h3>
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
  const [numberOfTeams, setNumberOfTeams] = useState(2);
  const [desiredPlayersPerTeam, setDesiredPlayersPerTeam] = useState(2);
  const [presentPlayerIds, setPresentPlayerIds] = useState(() => new Set(players.filter((player) => player.present).map((player) => player.id)));
  const [isPending, startTransition] = useTransition();
  const presentCount = presentPlayerIds.size;
  const maxTeams = Math.max(2, presentCount);
  const effectiveNumberOfTeams = Math.min(numberOfTeams, maxTeams);
  const remainingTeamsAfterPriority = Math.max(0, effectiveNumberOfTeams - 2);
  const maxPlayersPerTeam = Math.max(1, Math.floor((presentCount - remainingTeamsAfterPriority) / Math.min(2, effectiveNumberOfTeams)));
  const effectivePlayersPerTeam = Math.min(desiredPlayersPerTeam, maxPlayersPerTeam);
  const requestedPlayers = effectiveNumberOfTeams * effectivePlayersPerTeam;
  const hasEnoughPlayers = presentCount >= effectiveNumberOfTeams;

  function handlePresenceChange(playerId: string, present: boolean) {
    setPresentPlayerIds((current) => {
      const next = new Set(current);
      if (present) {
        next.add(playerId);
      } else {
        next.delete(playerId);
      }
      return next;
    });
  }

  useEffect(() => {
    setNumberOfTeams((current) => Math.min(current, maxTeams));
  }, [maxTeams]);

  useEffect(() => {
    setDesiredPlayersPerTeam((current) => Math.min(current, maxPlayersPerTeam));
  }, [maxPlayersPerTeam]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!hasEnoughPlayers) {
      setError(`Voce marcou ${presentCount} jogadores presentes, mas precisa de pelo menos ${effectiveNumberOfTeams}.`);
      return;
    }

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
      <div className="rounded-[13px] border-[1.5px] border-linha bg-areia p-3">
        <p className="font-jersey text-xs font-semibold uppercase tracking-[.14em] text-musgo">Jogadores presentes</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <span className="font-display text-3xl font-extrabold text-campo">{presentCount}</span>
          <span className={cn("text-right text-xs font-bold", hasEnoughPlayers ? "text-musgo" : "text-ausente")}>
            {requestedPlayers} vagas alvo
          </span>
        </div>
        {!hasEnoughPlayers ? (
          <p className="mt-2 text-xs font-semibold text-ausente">
            Reduza a quantidade de times ou marque mais presentes.
          </p>
        ) : null}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <Label>Quantidade de times</Label>
          <span className="font-jersey text-2xl font-bold text-campo">{effectiveNumberOfTeams}</span>
        </div>
        <input
          name="numberOfTeams"
          type="range"
          min={2}
          max={maxTeams}
          step={1}
          value={effectiveNumberOfTeams}
          onChange={(event) => setNumberOfTeams(Number(event.target.value))}
          disabled={presentCount < 2}
          className="h-2 w-full cursor-pointer accent-campo disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-musgo">Maximo conforme presentes: {maxTeams} times.</p>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <Label>Jogadores por time</Label>
          <span className="font-jersey text-2xl font-bold text-campo">{effectivePlayersPerTeam}</span>
        </div>
        <input
          name="desiredPlayersPerTeam"
          type="range"
          min={1}
          max={maxPlayersPerTeam}
          step={1}
          value={effectivePlayersPerTeam}
          onChange={(event) => setDesiredPlayersPerTeam(Number(event.target.value))}
          disabled={presentCount < 2}
          className="h-2 w-full cursor-pointer accent-campo disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-musgo">
          Maximo para tentar completar os 2 primeiros times: {maxPlayersPerTeam}.
        </p>
      </div>
      <div className="space-y-2">
        <div>
          <h2 className="font-display text-lg font-bold">Selecao final</h2>
          <p className="text-sm text-musgo">Marque quem esta presente e confirme se e mensalista ou convidado.</p>
        </div>
        <div className="stagger space-y-2">
          {players.map((player) => (
            <PlayerSelectionCard key={player.id} player={player} onPresenceChange={handlePresenceChange} />
          ))}
        </div>
      </div>
      <SubmitButton className="w-full" pendingLabel="Gerando times..." disabled={!hasEnoughPlayers}>
        {isPending ? "Gerando times..." : "Gerar times"}
      </SubmitButton>
    </form>
  );
}
