"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Select } from "@/components/ui/Input";
import { requestMatchGuestSlot } from "@/lib/radarActions";

export function RequestGuestSlotButton({
  matchId,
  status,
  lineAvailable,
  goalkeeperAvailable
}: {
  matchId: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  lineAvailable: boolean;
  goalkeeperAvailable: boolean;
}) {
  const [position, setPosition] = useState(lineAvailable ? "LINHA" : "GOLEIRO");

  if (status === "PENDING") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-[#C58207]">
        <Clock size={14} /> Pedido pendente
      </span>
    );
  }

  if (status === "APPROVED") {
    return <span className="text-xs font-bold text-campo">Voce esta confirmado nessa pelada</span>;
  }

  if (!lineAvailable && !goalkeeperAvailable) {
    return <span className="text-xs font-bold text-musgo">Vagas esgotadas</span>;
  }

  return (
    <form action={requestMatchGuestSlot.bind(null, matchId)} className="flex items-center gap-2">
      <Select name="position" value={position} onChange={(event) => setPosition(event.target.value)} className="min-h-9 flex-1 text-sm">
        <option value="LINHA" disabled={!lineAvailable}>Linha</option>
        <option value="GOLEIRO" disabled={!goalkeeperAvailable}>Goleiro</option>
      </Select>
      <SubmitButton className="py-2 text-xs" pendingLabel="Enviando...">
        Quero jogar
      </SubmitButton>
    </form>
  );
}
