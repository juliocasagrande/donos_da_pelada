"use client";

import { Button } from "@/components/ui/Button";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { voteCraque } from "@/lib/actions";

export function VoteCraqueForm({ pollId, playerId }: { pollId: string; playerId: string }) {
  const [state, formAction, isPending] = useActionFeedback(
    () => voteCraque(pollId, playerId),
    { successMessage: "Voto salvo." }
  );

  return (
    <div>
      <form action={formAction}>
        <Button variant="ghost" type="submit" className="px-4 py-2 text-campo" disabled={isPending}>
          Votar
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-xs font-semibold text-ausente">{state.error}</p> : null}
    </div>
  );
}
