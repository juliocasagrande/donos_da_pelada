"use client";

import { useActionState, useEffect } from "react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { updateStats } from "@/lib/actions";

type ActionState = { ok: boolean; error?: string } | null;

type MatchStatsPlayer = {
  id: string;
  nickname: string;
  photoUrl: string | null;
  position: string;
  goals: number;
  defenses: number;
};

export function MatchStatsForm({ matchId, players }: { matchId: string; players: MatchStatsPlayer[] }) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    (_prevState: ActionState, formData: FormData) => updateStats(matchId, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Estatisticas salvas.");
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-3">
      {players.map((player) => (
        <div key={player.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-[13px] bg-areia p-3">
          <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
          <div>
            <h2 className="font-black">{player.nickname}</h2>
            <input type="hidden" name="playerId" value={player.id} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-musgo">
                Gols
                <Input name={`goals-${player.id}`} type="number" min={0} defaultValue={player.goals} />
              </label>
              <label className="text-xs text-musgo">
                Defesas
                <Input name={`defenses-${player.id}`} type="number" min={0} defaultValue={player.defenses} />
              </label>
            </div>
          </div>
        </div>
      ))}
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar estatisticas"}
      </Button>
    </form>
  );
}
