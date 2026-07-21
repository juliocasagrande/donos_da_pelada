"use client";

import { Button } from "@/components/ui/Button";
import { RatingSlider } from "@/components/forms/RatingSlider";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { ratePlayerPerformance } from "@/lib/actions";

export function RatePlayerForm({
  matchId,
  playerId,
  defaultValue
}: {
  matchId: string;
  playerId: string;
  defaultValue: number;
}) {
  const [state, formAction, isPending] = useActionFeedback(
    (_prevState, formData: FormData) => ratePlayerPerformance(matchId, playerId, formData),
    { successMessage: "Nota salva." }
  );

  return (
    <div>
      <form action={formAction} className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
        <RatingSlider name="rating" defaultValue={defaultValue} />
        <Button type="submit" variant="secondary" disabled={isPending}>
          Dar nota
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-xs font-semibold text-ausente">{state.error}</p> : null}
    </div>
  );
}
