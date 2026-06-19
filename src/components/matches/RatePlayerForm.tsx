"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { RatingSlider } from "@/components/forms/RatingSlider";
import { useToast } from "@/components/ui/ToastProvider";
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
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    (_prevState: { ok: boolean; error?: string } | null, formData: FormData) =>
      ratePlayerPerformance(matchId, playerId, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Nota salva.");
    if (state.error) toast.error(state.error);
  }, [state, toast]);

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
