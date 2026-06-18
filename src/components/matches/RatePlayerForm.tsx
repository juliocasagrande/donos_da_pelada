"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
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
  const [rating, setRating] = useState(defaultValue);
  const [state, formAction, isPending] = useActionState(
    (_prevState: { ok: boolean; error?: string } | null, formData: FormData) =>
      ratePlayerPerformance(matchId, playerId, formData),
    null
  );

  return (
    <div>
      <form action={formAction} className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-musgo">Nota</span>
            <span className="font-jersey text-2xl font-bold text-campo">{rating.toFixed(1)}</span>
          </div>
          <input type="hidden" name="rating" value={rating} />
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-campo"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Dar nota
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-xs font-semibold text-ausente">{state.error}</p> : null}
    </div>
  );
}
