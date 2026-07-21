"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { updateOwnAttendanceStatus } from "@/lib/actions";
import { cn } from "@/lib/utils";

type AttendanceStatus = "CONFIRMED" | "WAITLIST" | "OUT" | null;

export function DashboardAttendanceActions({
  matchId,
  attendanceStatus
}: {
  matchId: string;
  attendanceStatus: AttendanceStatus;
}) {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>(attendanceStatus);
  const [confirmState, confirmAction, confirmPending] = useActionFeedback(
    () => updateOwnAttendanceStatus(matchId, true),
    { onSuccess: (result) => setSelectedStatus(result.status) }
  );
  const [declineState, declineAction, declinePending] = useActionFeedback(
    () => updateOwnAttendanceStatus(matchId, false),
    { onSuccess: (result) => setSelectedStatus(result.status) }
  );
  const isPending = confirmPending || declinePending;
  const currentState = confirmState ?? declineState;
  const isGoing = selectedStatus === "CONFIRMED" || selectedStatus === "WAITLIST";
  const isOut = selectedStatus === "OUT";
  const hasSelectedStatus = isGoing || isOut;

  useEffect(() => {
    setSelectedStatus(attendanceStatus);
  }, [attendanceStatus]);

  return (
    <div className="relative z-30 mt-4">
      <div className="flex gap-2">
        <form action={confirmAction} className="flex-1">
          <Button
            type="submit"
            className={cn(
              "w-full gap-1.5 border uppercase shadow-none",
              isGoing
                ? "border-white bg-craque text-tinta ring-2 ring-white/80"
                : cn("border-craque bg-craque text-tinta", hasSelectedStatus ? "opacity-55" : "opacity-90")
            )}
            disabled={isPending}
          >
            {isGoing ? <Check size={15} /> : null}
            {confirmPending ? "Confirmando..." : selectedStatus === "WAITLIST" ? "Na espera" : "Vou jogar"}
          </Button>
        </form>
        <form action={declineAction} className="flex-1">
          <Button
            type="submit"
            className={cn(
              "w-full gap-1.5 border bg-ausente uppercase text-white shadow-none",
              isOut ? "border-white ring-2 ring-white/80" : cn("border-ausente", hasSelectedStatus ? "opacity-55" : "opacity-90")
            )}
            disabled={isPending}
          >
            {isOut ? <X size={15} /> : null}
            {declinePending ? "Salvando..." : "NAO VOU"}
          </Button>
        </form>
      </div>
      {currentState && !currentState.ok ? <p className="mt-2 text-xs font-semibold text-[#FBE9E6]">{currentState.error}</p> : null}
    </div>
  );
}
