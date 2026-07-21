"use client";

import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { updateStats } from "@/lib/actions";

type MatchStatsPlayer = {
  id: string;
  nickname: string;
  photoUrl: string | null;
  position: string;
  goals: number;
  assists: number;
  defenses: number;
};

export function MatchStatsForm({ matchId, players }: { matchId: string; players: MatchStatsPlayer[] }) {
  const [state, formAction, isPending] = useActionFeedback(
    (_prevState, formData: FormData) => updateStats(matchId, formData),
    { successMessage: "Estatisticas salvas." }
  );

  return (
    <form action={formAction} className="space-y-3">
      {players.map((player) => (
        <div key={player.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-[13px] bg-areia p-3">
          <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
          <div>
            <h2 className="font-black">{player.nickname}</h2>
            <input type="hidden" name="playerId" value={player.id} />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="text-xs text-musgo">
                Gols
                <Input name={`goals-${player.id}`} type="number" min={0} defaultValue={player.goals} />
              </label>
              <label className="text-xs text-musgo">
                Assist.
                <Input name={`assists-${player.id}`} type="number" min={0} defaultValue={player.assists} />
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
