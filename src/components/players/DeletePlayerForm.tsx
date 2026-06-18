"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deletePlayer } from "@/lib/actions";

export function DeletePlayerForm({ playerId, playerName }: { playerId: string; playerName: string }) {
  return (
    <form
      action={deletePlayer.bind(null, playerId)}
      onSubmit={(event) => {
        if (!window.confirm(`Excluir ${playerName}? Isso remove tambem gols, defesas, notas e votos registrados para ele. Esta acao nao pode ser desfeita.`)) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" className="w-full">
        <Trash2 size={16} /> Excluir jogador
      </Button>
    </form>
  );
}
