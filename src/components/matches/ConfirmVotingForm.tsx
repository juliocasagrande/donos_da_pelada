"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { confirmMatchVoting } from "@/lib/actions";

export function ConfirmVotingForm({ matchId }: { matchId: string }) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    (_prevState: { ok: boolean; error?: string } | null) => confirmMatchVoting(matchId),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Votacao confirmada.");
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Confirmando..." : "Confirmar votacao"}
      </Button>
      {state?.error ? <p className="text-xs font-semibold text-ausente">{state.error}</p> : null}
    </form>
  );
}
