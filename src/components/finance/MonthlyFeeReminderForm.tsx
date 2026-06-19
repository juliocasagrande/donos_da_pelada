"use client";

import { useActionState, useEffect } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { sendMonthlyFeeReminder } from "@/lib/financeActions";

type ActionState = { ok: boolean; error?: string; count?: number } | null;

export function MonthlyFeeReminderForm({
  year,
  month,
  pendingCount
}: {
  year: number;
  month: number;
  pendingCount: number;
}) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    (_previous: ActionState) => sendMonthlyFeeReminder(year, month),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(`Cobranca enviada para ${state.count ?? 0} mensalista${state.count === 1 ? "" : "s"}.`);
    }
    if (state.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction}>
      <Button type="submit" className="w-full" disabled={isPending || pendingCount === 0}>
        <BellRing size={16} />
        {isPending ? "Enviando..." : `Cobrar pendentes (${pendingCount})`}
      </Button>
    </form>
  );
}
