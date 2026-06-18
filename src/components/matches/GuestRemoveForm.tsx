"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { removeGuestFromMatch } from "@/lib/actions";

export function GuestRemoveForm({ matchId, attendanceId }: { matchId: string; attendanceId: string }) {
  const [state, formAction, isPending] = useActionState(
    () => removeGuestFromMatch(matchId, attendanceId),
    null
  );

  return (
    <div>
      <form action={formAction}>
        <Button variant="ghost" className="px-3" title="Remover convidado" disabled={isPending}>
          <Trash2 size={16} />
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-xs font-semibold text-ausente">{state.error}</p> : null}
    </div>
  );
}
