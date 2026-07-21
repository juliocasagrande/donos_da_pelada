"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { updateMatchScore } from "@/lib/actions";

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
  const [state, formAction, isPending] = useActionFeedback(
    (_prevState, formData: FormData) => updateMatchScore(matchId, formData),
    { successMessage: "Placar salvo." }
  );

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
