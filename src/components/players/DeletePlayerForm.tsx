"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestPlayerDeletion } from "@/lib/deletionVotingActions";

export function DeletePlayerForm({ playerId, playerName }: { playerId: string; playerName: string }) {
  return (
    <form
      action={requestPlayerDeletion.bind(null, playerId)}
      onSubmit={(event) => {
        if (!window.confirm(`Abrir votacao para remover ${playerName} desta pelada? A remocao acontece quando mais de 50% dos admins votarem SIM.`)) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" className="w-full">
        <Trash2 size={16} /> Solicitar remocao
      </Button>
    </form>
  );
}
