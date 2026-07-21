"use client";

import { Button } from "@/components/ui/Button";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { voteCraque } from "@/lib/actions";

export function VoteCraqueForm({
  pollId,
  playerId,
  hasVoted = false,
  onVoted
}: {
  pollId: string;
  playerId: string;
  hasVoted?: boolean;
  onVoted?: () => void;
}) {
  const [state, formAction, isPending] = useActionFeedback(
    () => voteCraque(pollId, playerId),
    { successMessage: "Voto salvo.", onSuccess: () => onVoted?.() }
  );

  return (
    <div>
      <form action={formAction}>
        <Button variant="ghost" type="submit" className="px-4 py-2 text-campo" disabled={isPending}>
          {hasVoted ? "Trocar voto" : "Votar"}
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-xs font-semibold text-ausente">{state.error}</p> : null}
    </div>
  );
}
