"use client";

import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/forms/ConfirmSubmitButton";
import { requestPlayerDeletion } from "@/lib/deletionVotingActions";

export function DeletePlayerForm({ playerId, playerName }: { playerId: string; playerName: string }) {
  return (
    <form action={requestPlayerDeletion.bind(null, playerId)}>
      <ConfirmSubmitButton
        className="w-full bg-ausente text-white"
        title="Solicitar remocao"
        confirmLabel="Abrir votacao"
        confirmVariant="danger"
        pendingLabel="Solicitando..."
        message={`Abrir votacao para remover ${playerName} desta pelada? A remocao acontece quando mais de 50% dos admins votarem SIM.`}
      >
        <Trash2 size={16} /> Solicitar remocao
      </ConfirmSubmitButton>
    </form>
  );
}