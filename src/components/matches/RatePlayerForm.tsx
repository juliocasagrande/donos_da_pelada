"use client";

import { useActionState } from "react";
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
  const [state, formAction, isPending] = useActionState(
    (_prevState: { ok: boolean; error?: string } | null, formData: FormData) =>
      ratePlayerPerformance(matchId, playerId, formData),
    null
  );

  return (
    <div>
      <form action={formAction} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <select
          name="rating"
          defaultValue={defaultValue}
          className="min-h-10 rounded-[11px] border-[1.5px] border-linha bg-white px-3 text-sm font-bold outline-none"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Dar nota
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-xs font-semibold text-ausente">{state.error}</p> : null}
    </div>
  );
}
