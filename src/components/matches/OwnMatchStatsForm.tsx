"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { submitOwnMatchStats } from "@/lib/actions";

export function OwnMatchStatsForm({
  matchId,
  goals,
  assists,
  defenses,
  saved = false,
  onSaved,
  formId,
  hideSubmitButton = false
}: {
  matchId: string;
  goals: number;
  assists: number;
  defenses: number;
  saved?: boolean;
  onSaved?: () => void;
  formId?: string;
  hideSubmitButton?: boolean;
}) {
  const [editing, setEditing] = useState(!saved);
  const [savedGoals, setSavedGoals] = useState(goals);
  const [savedAssists, setSavedAssists] = useState(assists);
  const [savedDefenses, setSavedDefenses] = useState(defenses);
  const [state, formAction, isPending] = useActionFeedback(
    (_prevState, formData: FormData) => {
      setSavedGoals(Number(formData.get("goals") || 0));
      setSavedAssists(Number(formData.get("assists") || 0));
      setSavedDefenses(Number(formData.get("defenses") || 0));
      return submitOwnMatchStats(matchId, formData);
    },
    {
      successMessage: "Numeros salvos.",
      onSuccess: () => {
        setEditing(false);
        onSaved?.();
      }
    }
  );

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[13px] bg-areia p-3">
            <p className="text-xs font-bold uppercase text-musgo">Gols</p>
            <p className="font-jersey text-3xl font-bold text-campo">{savedGoals}</p>
          </div>
          <div className="rounded-[13px] bg-areia p-3">
            <p className="text-xs font-bold uppercase text-musgo">Assist.</p>
            <p className="font-jersey text-3xl font-bold text-campo">{savedAssists}</p>
          </div>
          <div className="rounded-[13px] bg-areia p-3">
            <p className="text-xs font-bold uppercase text-musgo">Defesas</p>
            <p className="font-jersey text-3xl font-bold text-campo">{savedDefenses}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" className="w-full" onClick={() => setEditing(true)}>
          <Pencil size={15} />
          Editar numeros
        </Button>
      </div>
    );
  }

  return (
    <form id={formId} action={formAction} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs font-semibold text-musgo">
          Gols
          <Input name="goals" type="number" min={0} defaultValue={goals} />
        </label>
        <label className="text-xs font-semibold text-musgo">
          Assist.
          <Input name="assists" type="number" min={0} defaultValue={assists} />
        </label>
        <label className="text-xs font-semibold text-musgo">
          Defesas
          <Input name="defenses" type="number" min={0} defaultValue={defenses} />
        </label>
      </div>
      {hideSubmitButton ? null : (
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar meus numeros"}
        </Button>
      )}
    </form>
  );
}
