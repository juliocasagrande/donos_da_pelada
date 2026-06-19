"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { updateMatchScore } from "@/lib/actions";

type ActionState = { ok: boolean; error?: string } | null;

export function MatchScoreForm({
  matchId,
  homeName,
  awayName,
  homeScore,
  awayScore
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
}) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    (_prevState: ActionState, formData: FormData) => updateMatchScore(matchId, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Placar salvo.");
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction} className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
      <label className="text-xs font-semibold text-musgo">
        {homeName}
        <Input name="homeScore" type="number" min={0} defaultValue={homeScore ?? ""} />
      </label>
      <span className="pb-3 text-sm font-black text-musgo">x</span>
      <label className="text-xs font-semibold text-musgo">
        {awayName}
        <Input name="awayScore" type="number" min={0} defaultValue={awayScore ?? ""} />
      </label>
      <div className="col-span-3">
        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar placar"}
        </Button>
      </div>
    </form>
  );
}
