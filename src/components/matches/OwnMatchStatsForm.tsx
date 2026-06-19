"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { submitOwnMatchStats } from "@/lib/actions";

type ActionState = { ok: boolean; error?: string } | null;

export function OwnMatchStatsForm({
  matchId,
  goals,
  defenses
}: {
  matchId: string;
  goals: number;
  defenses: number;
}) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    (_prevState: ActionState, formData: FormData) => submitOwnMatchStats(matchId, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Numeros salvos.");
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-musgo">
          Gols
          <Input name="goals" type="number" min={0} defaultValue={goals} />
        </label>
        <label className="text-xs font-semibold text-musgo">
          Defesas
          <Input name="defenses" type="number" min={0} defaultValue={defenses} />
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar meus numeros"}
      </Button>
    </form>
  );
}
