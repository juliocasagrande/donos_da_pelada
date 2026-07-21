"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { confirmMatchVoting } from "@/lib/actions";

export function ConfirmVotingForm({
  matchId,
  disabled = false,
  disabledReason
}: {
  matchId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, isPending] = useActionFeedback(
    () => confirmMatchVoting(matchId),
    { successMessage: "Votacao confirmada." }
  );

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" className="w-full" disabled={isPending || disabled}>
        {disabled ? <Lock size={16} /> : null}
        {isPending ? "Confirmando..." : "Confirmar votacao"}
      </Button>
      {disabled && disabledReason ? <p className="text-xs font-semibold text-musgo">{disabledReason}</p> : null}
      {state?.error ? <p className="text-xs font-semibold text-ausente">{state.error}</p> : null}
    </form>
  );
}
