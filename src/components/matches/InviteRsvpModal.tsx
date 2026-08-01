"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, Clock, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { useToast } from "@/components/ui/ToastProvider";
import { updateOwnAttendanceStatus } from "@/lib/actions";

export function InviteRsvpModal({
  matchId,
  title,
  time,
  location,
  initialOpen
}: {
  matchId: string;
  title: string;
  time: string;
  location?: string | null;
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Drop the ?rsvp=1 marker right away so a refresh or back-nav doesn't
    // reopen the popup once the user has already seen it.
    if (initialOpen) router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function respond(present: boolean) {
    startTransition(async () => {
      const result = await updateOwnAttendanceStatus(matchId, present);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Confirme sua presenca">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-musgo">
        <Clock size={14} /> {time}
      </p>
      <LocationLinks location={location} className="mt-1.5" />
      <div className="mt-4 flex gap-2 pb-1">
        <Button type="button" onClick={() => respond(true)} disabled={isPending} className="w-full gap-1.5 uppercase">
          <Check size={16} /> Vou
        </Button>
        <Button
          type="button"
          onClick={() => respond(false)}
          disabled={isPending}
          variant="secondary"
          className="w-full gap-1.5 uppercase"
        >
          <X size={16} /> Nao vou
        </Button>
      </div>
    </Modal>
  );
}
