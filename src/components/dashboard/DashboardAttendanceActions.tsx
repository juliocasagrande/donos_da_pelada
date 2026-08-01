"use client";

import { useOptimistic, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
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
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  // Flips the button to its target look the instant it's tapped instead of
  // waiting on the round-trip; if the server disagrees (error, or the guest
  // lands on the waitlist instead of confirmed), the next render reconciles
  // to the real attendanceStatus prop once revalidatePath refreshes it.
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(attendanceStatus);

  function respond(present: boolean) {
    startTransition(async () => {
      setOptimisticStatus(present ? "CONFIRMED" : "OUT");
      const result = await updateOwnAttendanceStatus(matchId, present);
      if (!result.ok) toast.error(result.error);
    });
  }

  const isGoing = optimisticStatus === "CONFIRMED" || optimisticStatus === "WAITLIST";
  const isOut = optimisticStatus === "OUT";
  const hasSelectedStatus = isGoing || isOut;

  return (
    <div className="relative z-30 mt-4">
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => respond(true)}
          disabled={isPending}
          className={cn(
            "w-full gap-1.5 border uppercase shadow-none",
            isGoing
              ? "border-white bg-craque text-tinta ring-2 ring-white/80"
              : cn("border-craque bg-craque text-tinta", hasSelectedStatus ? "opacity-55" : "opacity-90")
          )}
        >
          {isGoing ? <Check size={15} /> : null}
          {optimisticStatus === "WAITLIST" ? "Na espera" : "Vou jogar"}
        </Button>
        <Button
          type="button"
          onClick={() => respond(false)}
          disabled={isPending}
          className={cn(
            "w-full gap-1.5 border bg-ausente uppercase text-white shadow-none",
            isOut ? "border-white ring-2 ring-white/80" : cn("border-ausente", hasSelectedStatus ? "opacity-55" : "opacity-90")
          )}
        >
          {isOut ? <X size={15} /> : null}
          NAO VOU
        </Button>
      </div>
    </div>
  );
}
