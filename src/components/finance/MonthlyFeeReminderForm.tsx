"use client";

import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { sendMonthlyFeeReminder } from "@/lib/financeActions";

export function MonthlyFeeReminderForm({
  year,
  month,
  pendingCount
}: {
  year: number;
  month: number;
  pendingCount: number;
}) {
  const [state, formAction, isPending] = useActionFeedback(
    () => sendMonthlyFeeReminder(year, month),
    {
      successMessage: (result) =>
        `Cobranca enviada para ${result.count ?? 0} mensalista${result.count === 1 ? "" : "s"}.`
    }
  );

  return (
    <form action={formAction}>
      <Button type="submit" className="w-full" disabled={isPending || pendingCount === 0}>
        <BellRing size={16} />
        {isPending ? "Enviando..." : `Cobrar pendentes (${pendingCount})`}
      </Button>
    </form>
  );
}
